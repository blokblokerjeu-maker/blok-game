import '../App.css'

interface GameRulesProps {
  onBack: () => void
}

export function GameRules({ onBack }: GameRulesProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        overflowY: 'auto',
        padding: '20px',
        boxSizing: 'border-box',
        backgroundColor: '#f0f2f5'
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: '10px',
          left: 0,
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'flex-start',
          marginBottom: '20px'
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '8px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
          aria-label="Retour au lobby"
        >
          ←
        </button>
      </div>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          maxWidth: '900px',
          margin: '0 auto'
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            color: '#5596F2',
            marginBottom: '30px',
            fontSize: '42px',
            fontWeight: 'bold'
          }}
        >
          Règles du jeu BLOK
        </h1>

        {/* Objectif */}
        <section style={{ marginBottom: '40px' }}>
          <h2
            style={{
              color: '#333',
              borderBottom: '3px solid #5596F2',
              paddingBottom: '10px',
              marginBottom: '20px',
              fontSize: '26px'
            }}
          >
            🎯 Objectif
          </h2>
          <p style={{ fontSize: '18px', lineHeight: '1.8', color: '#555' }}>
            Capturer <strong>4 BLOK adverses</strong> (ou plus selon la configuration) tout en ayant <strong>au moins 1 BLOK d'avance</strong> sur votre adversaire. Quand un joueur atteint cet objectif, l'adversaire a droit à un <strong>dernier tour</strong> pour égaliser ou reprendre l'avantage.
          </p>
        </section>

        {/* Les Pièces */}
        <section style={{ marginBottom: '40px' }}>
          <h2
            style={{
              color: '#333',
              borderBottom: '3px solid #5596F2',
              paddingBottom: '10px',
              marginBottom: '20px',
              fontSize: '26px'
            }}
          >
            ♟️ Les Pièces
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px'
            }}
          >
            <div
              style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #5596F2'
              }}
            >
              <h3 style={{ color: '#5596F2', marginBottom: '10px' }}>⚫ Les BLOK</h3>
              <p style={{ lineHeight: '1.6', color: '#555' }}>
                • Se déplacent de <strong>1 ou 2 cases</strong><br />
                • Peuvent <strong>capturer</strong> les BLOK adverses<br />
                • Ne peuvent <strong>PAS</strong> capturer les BLOKER<br />
                • Un saut de 2 cases est bloqué si un BLOKER adverse est sur le chemin
              </p>
            </div>

            <div
              style={{
                background: '#f8f9fa',
                padding: '20px',
                borderRadius: '12px',
                border: '2px solid #666'
              }}
            >
              <h3 style={{ color: '#666', marginBottom: '10px' }}>◼️ Les BLOKER</h3>
              <p style={{ lineHeight: '1.6', color: '#555' }}>
                • Se déplacent de <strong>1 case</strong><br />
                • Servent à <strong>bloquer</strong> les mouvements adverses<br />
                • Ne peuvent <strong>jamais capturer</strong><br />
                • Bloquent les sauts de 2 cases des BLOK adverses
              </p>
            </div>
          </div>
        </section>

        {/* Plateau */}
        <section style={{ marginBottom: '40px' }}>
          <h2
            style={{
              color: '#333',
              borderBottom: '3px solid #5596F2',
              paddingBottom: '10px',
              marginBottom: '20px',
              fontSize: '26px'
            }}
          >
            🗺️ Le Plateau
          </h2>
          <p style={{ fontSize: '18px', lineHeight: '1.8', color: '#555' }}>
            Le plateau est <strong>infini verticalement</strong> : quand une pièce sort par le haut, elle réapparaît en bas (et inversement).
          </p>
          <ul style={{ fontSize: '16px', lineHeight: '2', color: '#555', marginLeft: '20px' }}>
            <li><strong>8×8</strong> : classique</li>
            <li><strong>8×8 sans coins</strong> : 60 cases</li>
            <li><strong>6×8</strong> : 48 cases</li>
            <li><strong>4×8</strong> : 32 cases</li>
          </ul>
        </section>

        {/* Déroulement */}
        <section style={{ marginBottom: '40px' }}>
          <h2
            style={{
              color: '#333',
              borderBottom: '3px solid #5596F2',
              paddingBottom: '10px',
              marginBottom: '20px',
              fontSize: '26px'
            }}
          >
            🔄 Déroulement
          </h2>
          <ol style={{ fontSize: '18px', lineHeight: '2', color: '#555', marginLeft: '20px' }}>
            <li>Les <strong>BLANCS commencent</strong></li>
            <li>Chaque joueur joue <strong>1 ou 2 coups</strong></li>
            <li>Les captures sont uniquement BLOK vs BLOK</li>
            <li>Le premier à atteindre l'objectif déclenche le <strong>dernier tour</strong></li>
          </ol>
        </section>

        {/* Fin de Partie */}
        <section style={{ marginBottom: '40px' }}>
          <h2
            style={{
              color: '#333',
              borderBottom: '3px solid #5596F2',
              paddingBottom: '10px',
              marginBottom: '20px',
              fontSize: '26px'
            }}
          >
            🏆 Fin de Partie
          </h2>
          <ul style={{ fontSize: '16px', lineHeight: '2', color: '#555', marginLeft: '20px' }}>
            <li>4 BLOK capturés ou plus</li>
            <li>1 BLOK d'avance minimum</li>
            <li>Dernier tour terminé</li>
          </ul>
        </section>

        {/* Indicateurs */}
        <section style={{ marginBottom: '40px' }}>
          <h2
            style={{
              color: '#333',
              borderBottom: '3px solid #5596F2',
              paddingBottom: '10px',
              marginBottom: '20px',
              fontSize: '26px'
            }}
          >
            👁️ Indicateurs Visuels
          </h2>
          <ul style={{ fontSize: '16px', lineHeight: '2', color: '#555', marginLeft: '20px' }}>
            <li><strong style={{ color: '#4CBBE9' }}>Cases cyan</strong> : dernier mouvement</li>
            <li><strong style={{ color: '#666' }}>Pastille grise</strong> : déplacement possible</li>
            <li><strong style={{ color: '#ff3b30' }}>Pastille rouge</strong> : capture possible</li>
          </ul>
        </section>

        {/* Stratégie */}
        <section>
          <h2
            style={{
              color: '#333',
              borderBottom: '3px solid #5596F2',
              paddingBottom: '10px',
              marginBottom: '20px',
              fontSize: '26px'
            }}
          >
            🧠 Conseils Stratégiques
          </h2>
          <ul style={{ fontSize: '16px', lineHeight: '2', color: '#555', marginLeft: '20px' }}>
            <li>Utilisez les BLOKER pour défendre</li>
            <li>Le plateau infini permet des contournements</li>
            <li>Anticipez le dernier tour</li>
            <li>Planifiez vos deux coups à l’avance</li>
          </ul>
        </section>

        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <button
            onClick={onBack}
            style={{
              background: '#5596F2',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(85, 150, 242, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Retour au Lobby
          </button>
        </div>
      </div>
    </div>
  )
}