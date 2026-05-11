import React from 'react';
import './VehiculeCard.css';

const VehiculeCard = ({
  vehicule,
  index,
  onUpdateVehicule
}) => {
  return (
    <div className="vehicule-card">
      <div className="vehicule-card-header">
        Véhicule {index + 1}
      </div>
      <div className="vehicule-card-body">
        {/* Type de véhicule */}
        <div className="form-group">
          <label className="form-label">
            Type de véhicule <span className="required">*</span>
          </label>
          <select
            className="form-select"
            value={vehicule.type_vehicule}
            onChange={(e) => onUpdateVehicule(vehicule.id, 'type_vehicule', e.target.value)}
            required
          >
            <option value="voiture">🚗 Voiture</option>
            <option value="moto">🏍️ Moto</option>
            <option value="camion">🚚 Camion</option>
            <option value="bus">🚌 Bus</option>
          </select>
        </div>

        {/* Immatriculation */}
        <div className="form-group">
          <label className="form-label">
            Immatriculation <span className="required">*</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={vehicule.immatriculation}
            onChange={(e) => onUpdateVehicule(vehicule.id, 'immatriculation', e.target.value.toUpperCase())}
            placeholder="Ex: CD-123-ABC"
            required
          />
        </div>

        {/* Marque */}
        <div className="form-group">
          <label className="form-label">Marque</label>
          <input
            type="text"
            className="form-input"
            value={vehicule.marque}
            onChange={(e) => onUpdateVehicule(vehicule.id, 'marque', e.target.value)}
            placeholder="Ex: Toyota, Honda, etc."
          />
        </div>

        {/* Modèle */}
        <div className="form-group">
          <label className="form-label">Modèle</label>
          <input
            type="text"
            className="form-input"
            value={vehicule.modele}
            onChange={(e) => onUpdateVehicule(vehicule.id, 'modele', e.target.value)}
            placeholder="Ex: Corolla, Civic, etc."
          />
        </div>

        {/* Couleur */}
        <div className="form-group">
          <label className="form-label">Couleur</label>
          <input
            type="text"
            className="form-input"
            value={vehicule.couleur}
            onChange={(e) => onUpdateVehicule(vehicule.id, 'couleur', e.target.value)}
            placeholder="Ex: Blanc, Noir, etc."
          />
        </div>

        {/* Année */}
        <div className="form-group">
          <label className="form-label">Année</label>
          <input
            type="number"
            className="form-input"
            value={vehicule.annee}
            onChange={(e) => onUpdateVehicule(vehicule.id, 'annee', e.target.value)}
            placeholder="Ex: 2020"
            min="1900"
            max={new Date().getFullYear() + 1}
          />
        </div>

        {/* Propriétaire */}
        <div className="form-group">
          <label className="form-label">Nom du propriétaire</label>
          <input
            type="text"
            className="form-input"
            value={vehicule.proprietaire_nom}
            onChange={(e) => onUpdateVehicule(vehicule.id, 'proprietaire_nom', e.target.value)}
            placeholder="Nom complet du propriétaire"
          />
        </div>

        {/* Téléphone du propriétaire */}
        <div className="form-group">
          <label className="form-label">Téléphone du propriétaire</label>
          <input
            type="tel"
            className="form-input"
            value={vehicule.proprietaire_telephone}
            onChange={(e) => onUpdateVehicule(vehicule.id, 'proprietaire_telephone', e.target.value)}
            placeholder="+243 XXX XXX XXX"
          />
        </div>
      </div>
    </div>
  );
};

export default VehiculeCard;
