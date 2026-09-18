import { useCallback, useState } from 'react';

export const FadeImage = ({ className = '', ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const checkAlreadyLoaded = useCallback(node => {
    if (node && node.complete) setLoaded(true);
  }, []);
  return (
    <img
      ref={checkAlreadyLoaded}
      onLoad={() => setLoaded(true)}
      className={`fade-image${loaded ? ' is-loaded' : ''}${className ? ` ${className}` : ''}`}
      {...props}
    />
  );
};
