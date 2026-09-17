"""API tests for health and access request persistence/validation flows."""

import os

import pytest
import requests
from dotenv import load_dotenv
from pymongo import MongoClient


load_dotenv('/app/frontend/.env')
load_dotenv('/app/backend/.env')

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME')


@pytest.fixture(scope='module')
def api_base_url():
    if not BASE_URL:
        pytest.skip('REACT_APP_BACKEND_URL is missing, skipping API tests')
    return BASE_URL.rstrip('/')


@pytest.fixture(scope='module')
def mongo_collection():
    if not MONGO_URL or not DB_NAME:
        pytest.skip('Mongo environment not available for persistence checks')
    client = MongoClient(MONGO_URL)
    collection = client[DB_NAME].access_requests
    yield collection
    client.close()


def test_health_ok(api_base_url):
    response = requests.get(f'{api_base_url}/api/', timeout=15)

    assert response.status_code == 200
    data = response.json()
    assert data == {'name': 'VIDERE', 'status': 'ok'}


def test_access_request_success_and_persisted(api_base_url, mongo_collection):
    payload = {
        'name': 'QA Videre',
        'email': 'qa.videre@example.com',
        'company': 'QA SME Co',
        'company_size': '11–50',
        'consent': True,
    }
    mongo_collection.delete_many({'email': payload['email']})

    response = requests.post(f'{api_base_url}/api/access-requests', json=payload, timeout=20)

    assert response.status_code == 201
    data = response.json()
    assert data['success'] is True
    assert 'registrada' in data['message'].lower()

    record = mongo_collection.find_one({'email': payload['email']})
    assert record is not None
    assert record['name'] == payload['name']
    assert record['company'] == payload['company']
    assert record['company_size'] == payload['company_size']
    assert record['consent'] is True


def test_access_request_duplicate_email_is_idempotent(api_base_url, mongo_collection):
    payload = {
        'name': 'QA Videre Updated Name',
        'email': 'qa.videre@example.com',
        'company': 'QA SME Co Updated',
        'company_size': '51–200',
        'consent': True,
    }

    first = requests.post(f'{api_base_url}/api/access-requests', json=payload, timeout=20)
    second = requests.post(f'{api_base_url}/api/access-requests', json=payload, timeout=20)

    assert first.status_code == 201
    assert second.status_code == 201
    count = mongo_collection.count_documents({'email': payload['email']})
    assert count == 1

    stored = mongo_collection.find_one({'email': payload['email']})
    assert stored['name'] == 'QA Videre'
    assert stored['company'] == 'QA SME Co'


def test_access_request_rejects_false_consent(api_base_url):
    payload = {
        'name': 'QA Consent',
        'email': 'qa.consent@example.com',
        'company': 'Consent Co',
        'company_size': '1–10',
        'consent': False,
    }

    response = requests.post(f'{api_base_url}/api/access-requests', json=payload, timeout=20)

    assert response.status_code == 422
    detail = response.json()['detail']
    assert any('consentimiento' in str(item.get('msg', '')).lower() for item in detail)


def test_access_request_rejects_bad_email(api_base_url):
    payload = {
        'name': 'QA Bad Email',
        'email': 'not-an-email',
        'company': 'Correo Malo SA',
        'company_size': '11–50',
        'consent': True,
    }

    response = requests.post(f'{api_base_url}/api/access-requests', json=payload, timeout=20)

    assert response.status_code == 422
    detail = response.json()['detail']
    assert any(item.get('loc', [])[-1] == 'email' for item in detail)


def test_access_request_rejects_invalid_company_size(api_base_url):
    payload = {
        'name': 'QA Invalid Size',
        'email': 'qa.invalid-size@example.com',
        'company': 'Size Co',
        'company_size': '999',
        'consent': True,
    }

    response = requests.post(f'{api_base_url}/api/access-requests', json=payload, timeout=20)

    assert response.status_code == 422
    detail = response.json()['detail']
    assert any('tamaño de tu equipo' in str(item.get('msg', '')).lower() for item in detail)


def test_access_request_rejects_whitespace_name(api_base_url):
    payload = {
        'name': '   ',
        'email': 'qa.whitespace@example.com',
        'company': 'Whitespace Co',
        'company_size': '1–10',
        'consent': True,
    }

    response = requests.post(f'{api_base_url}/api/access-requests', json=payload, timeout=20)

    assert response.status_code == 422
    detail = response.json()['detail']
    assert any(item.get('loc', [])[-1] == 'name' for item in detail)
