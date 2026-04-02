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
    this.reloadTimer = null;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  componentDidUpdate(prevProps, prevState) {
    // Démarrer les mécanismes uniquement quand l'erreur apparaît
    if (!prevState.hasError && this.state.hasError) {
      // 1. Rotation des messages
      if (!this.interval) {
        this.interval = setInterval(() => {
          this.setState(prev => ({
            messageIndex: (prev.messageIndex + 1) % messages.length
          }));
        }, 3000);
      }

      // 2. Rechargement automatique après un délai (15 secondes)
      if (!this.reloadTimer) {
        this.reloadTimer = setTimeout(() => {
          window.location.reload();
        }, 15000);
      }
    }
  }

  componentWillUnmount() {
    if (this.interval) clearInterval(this.interval);
    if (this.reloadTimer) clearTimeout(this.reloadTimer);
  }

  handleManualReload = () => {
    // Annuler le timer pour éviter un double rechargement
    if (this.reloadTimer) {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = null;
    }
    window.location.reload();
  };

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
            .reload-button {
              margin-top: 20px;
              padding: 8px 16px;
              background-color: #ff6b6b;
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-size: 1rem;
              transition: background-color 0.2s;
            }
            .reload-button:hover {
              background-color: #ff5252;
            }
          `}</style>
          <div className="fancy-spinner"></div>
          <p className="message">{messages[this.state.messageIndex]}</p>
          <button className="reload-button" onClick={this.handleManualReload}>
            Recharger maintenant
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;