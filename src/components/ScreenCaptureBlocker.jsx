import React from 'react';

const ScreenCaptureBlocker = () => {
  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' version='1.1' height='50px' width='50px'><text x='0' y='15' fill='rgba(0,0,0,0.03)' font-size='10' transform='rotate(-45 10 10)'>BonPlanInfos</text></svg>")`,
    backgroundRepeat: 'repeat',
    pointerEvents: 'none',
    zIndex: 99999,
  };

  return <div style={overlayStyle}></div>;
};

const styles = `
  @media print {
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      display: none !important;
    }
    
    html::before {
      content: "La capture d'écran et l'impression sont désactivées pour protéger le contenu de cette application.";
      display: block;
      padding: 20px;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      color: #000;
    }
  }

  body {
    -webkit-touch-callout: none; /* iOS Safari */
    -webkit-user-select: none; /* Safari */
    -khtml-user-select: none; /* Konqueror HTML */
    -moz-user-select: none; /* Old versions of Firefox */
    -ms-user-select: none; /* Internet Explorer/Edge */
    user-select: none; /* Non-prefixed version, currently supported by Chrome, Opera and Firefox */
  }
`;

const StyleInjector = () => {
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = styles;
    document.head.appendChild(styleElement);
    
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
            e.preventDefault();
        }
        if (e.key === 'PrintScreen') {
            e.preventDefault();
        }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.head.removeChild(styleElement);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  
  return null;
};

const Blocker = () => (
  <>
    <ScreenCaptureBlocker />
    <StyleInjector />
  </>
);


export default Blocker;