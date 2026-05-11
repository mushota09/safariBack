import React from 'react';
import './LitCard.css';

const LitCard = ({ lit, selected, occupied, onSelect }) => {
  const handleClick = () => {
    if (!occupied && onSelect) {
      onSelect();
    }
  };

  const getTypeLitIcon = (type) => {
    switch (type) {
      case 'simple':
        return '🛏️ Simple';
      case 'double':
        return '🛏️🛏️ Double';
      case 'superpose':
        return '🪜 Superposé';
      default:
        return type;
    }
  };

  return (
    <div
      className={`lit-card ${selected ? 'selected' : ''} ${occupied ? 'occupied' : ''}`}
      onClick={handleClick}
    >
      <div className="lit-numero">Lit {lit.numero_lit}</div>
      <div className="lit-type">{getTypeLitIcon(lit.type_lit)}</div>
      {lit.taille && <div className="lit-taille">{lit.taille}</div>}
      {lit.prix_supplementaire > 0 && (
        <div className="lit-prix">+{lit.prix_supplementaire}€</div>
      )}
      {occupied && <div className="lit-occupied-badge">Occupé</div>}
    </div>
  );
};

export default LitCard;
