import React from 'react';
import './ChambreCard.css';

const ChambreCard = ({ chambre, selected, occupied, onSelect }) => {
  const handleClick = () => {
    if (!occupied && onSelect) {
      onSelect();
    }
  };

  return (
    <div
      className={`chambre-card ${selected ? 'selected' : ''} ${occupied ? 'occupied' : ''}`}
      onClick={handleClick}
    >
      <div className="chambre-header">
        <span className="chambre-numero">{chambre.numero_chambre}</span>
        <span className={`chambre-badge ${occupied ? 'occupe' : 'disponible'}`}>
          {occupied ? 'Occupé' : 'Disponible'}
        </span>
      </div>
      <div className="chambre-body">
        {chambre.type_chambre && (
          <div className="chambre-type">{chambre.type_chambre}</div>
        )}
        <div className="chambre-features">
          {chambre.fenetre && <span>🪟 Fenêtre</span>}
          {chambre.salle_de_bain && <span>🚿 Salle de bain</span>}
        </div>
        <div className="chambre-niveau">{chambre.niveau_nom}</div>
      </div>
      <div className="chambre-footer">
        <span className="chambre-prix">+{chambre.prix_base}€</span>
        <span className="chambre-lits">{chambre.lits_disponibles?.length || 0} lits</span>
      </div>
    </div>
  );
};

export default ChambreCard;
