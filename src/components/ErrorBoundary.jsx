import React from 'react';

const spinnerStyles = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  flexDirection: 'column',
};

const messages = [
  "Chargement en cours, patientez...",
  "Patientez toujours un instant...",
  "Dernier tour...",
  "Actualiser la page ?",
  "Vérifiez votre connexion...",
  "Réactualisez votre page si nécessaire..."
];

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, messageIndex: 0 };
    this.interval = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  componentDidUpdate(prevProps, prevState) {
    // Démarrer l'intervalle uniquement quand l'erreur apparaît
    if (!prevState.hasError && this.state.hasError && !this.interval) {
      this.interval = setInterval(() => {
        this.setState(prev => ({
          messageIndex: (prev.messageIndex + 1) % messages.length
        }));
      }, 3000); // Change de message toutes les 3 secondes
    }
  }

  componentWillUnmount() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={spinnerStyles}>
          <style>{`
            .fancy-spinner {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              background: conic-gradient(from 0deg, #ff6b6b, #feca57, #48dbfb, #ff6b6b);
              mask: radial-gradient(circle at 50% 50%, transparent 55%, black 56%);
              animation: spin 1.5s linear infinite;
              box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            .message {
              margin-top: 20px;
              color: #666;
              font-family: sans-serif;
              font-size: 1.1rem;
              transition: opacity 0.3s ease;
            }
          `}</style>
          <div className="fancy-spinner"></div>
          <p className="message">{messages[this.state.messageIndex]}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;