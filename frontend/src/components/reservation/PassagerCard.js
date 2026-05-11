import React from 'react';
import ChambreCard from './ChambreCard';
import LitCard from './LitCard';
import './PassagerCard.css';

const PassagerCard = ({
  passager,
  index,
  chambres,
  onUpdatePassager,
  onUpdateChambreChoice,
  onSelectChambre,
  onSelectLit,
  getLitsDisponibles,
  isLitOccupied
}) => {
  return (
    <div className="passager-card">
      <div className="passager-card-header">
        Passager {index + 1} {passager.is_current_user && '(Vous)'}
      </div>
      <div className="passager-card-body">
        {/* Informations personnelles */}
        <div className="form-group">
          <label className="form-label">
            Nom complet <span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={passager.nom_complet}
            onChange={(e) => onUpdatePassager(passager.id, 'nom_complet', e.target.value)}
            placeholder="Nom complet"
            disabled={passager.is_current_user}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            value={passager.email}
            onChange={(e) => onUpdatePassager(passager.id, 'email', e.target.value)}
            placeholder="email@example.com"
            disabled={passager.is_current_user}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Numéro de téléphone</label>
          <input
            type="tel"
            className="form-input"
            value={passager.telephone}
            onChange={(e) => onUpdatePassager(passager.id, 'telephone', e.target.value)}
            placeholder="+243 XXX XXX XXX"
            disabled={passager.is_current_user}
          />
        </div>

        {/* Choix de chambre */}
        <div className="chambre-choice-section">
          <label className="form-label">Préférence de chambre</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                name={`chambre-choice-${passager.id}`}
                checked={passager.chambre_choice === 'pour_tous'}
                onChange={() => onUpdateChambreChoice(passager.id, 'pour_tous')}
              />
              <span className="radio-text">Pour tous</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name={`chambre-choice-${passager.id}`}
                checked={passager.chambre_choice === 'chambre'}
                onChange={() => onUpdateChambreChoice(passager.id, 'chambre')}
              />
              <span className="radio-text">Chambre (...)</span>
            </label>
          </div>
        </div>

        {/* Afficher les chambres si "Chambre" est sélectionné */}
        {passager.chambre_choice === 'chambre' && !passager.chambre_id && (
          <div className="chambres-section">
            <h4 className="section-subtitle">Sélectionnez une chambre</h4>
            <div className="chambres-grid">
              {chambres.map(chambre => (
                <ChambreCard
                  key={chambre.id}
                  chambre={chambre}
                  selected={false}
                  occupied={false}
                  onSelect={() => onSelectChambre(passager.id, chambre.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Afficher les lits si une chambre est sélectionnée */}
        {passager.chambre_id && (
          <div className="lits-section">
            <h4 className="section-subtitle">Sélectionnez un lit</h4>
            <div className="lits-grid">
              {getLitsDisponibles(passager.chambre_id).map(lit => (
                <LitCard
                  key={lit.id}
                  lit={lit}
                  selected={passager.lit_id === lit.id}
                  occupied={isLitOccupied(lit.id) && passager.lit_id !== lit.id}
                  onSelect={() => onSelectLit(passager.id, lit.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PassagerCard;
