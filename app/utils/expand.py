from typing import List, Optional
from sqlalchemy.orm import selectinload
from sqlalchemy.orm.strategy_options import _AbstractLoad


def parse_expand(expand_str: Optional[str]) -> List[str]:
    """
    Parse la chaîne expand en liste de relations.

    Exemple:
        "bateaux,compagnie" -> ["bateaux", "compagnie"]
        "bateaux.compagnie,routes" -> ["bateaux.compagnie", "routes"]
    """
    if not expand_str:
        return []

    return [rel.strip() for rel in expand_str.split(",") if rel.strip()]


def apply_expand(query, model_class, expand_list: List[str]):
    """
    Applique les options selectinload dynamiquement sur une requête.

    Supporte les relations imbriquées avec la notation point.
    Exemple: "bateaux.compagnie" charge bateaux puis compagnie dans bateaux
    """
    if not expand_list:
        return query

    for expand_path in expand_list:
        parts = expand_path.split(".")

        # Vérifier que la première relation existe
        if not hasattr(model_class, parts[0]):
            continue

        # Construire le selectinload imbriqué
        if len(parts) == 1:
            # Relation simple
            query = query.options(selectinload(getattr(model_class, parts[0])))
        else:
            # Relation imbriquée
            loader = selectinload(getattr(model_class, parts[0]))

            # Parcourir les parties imbriquées
            current_model = getattr(model_class, parts[0]).property.mapper.class_
            for part in parts[1:]:
                if hasattr(current_model, part):
                    loader = loader.selectinload(getattr(current_model, part))
                    current_model = getattr(current_model, part).property.mapper.class_

            query = query.options(loader)

    return query
