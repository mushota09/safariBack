.PHONY: help install dev db-init db-migrate db-upgrade run test clean docker-up docker-down

help:
	@echo "Commandes disponibles:"
	@echo "  make install      - Installer les dépendances"
	@echo "  make dev          - Installer les dépendances de développement"
	@echo "  make db-init      - Initialiser la base de données avec des données de test"
	@echo "  make db-migrate   - Créer une nouvelle migration"
	@echo "  make db-upgrade   - Appliquer les migrations"
	@echo "  make run          - Lancer l'API en mode développement"
	@echo "  make test         - Lancer les tests"
	@echo "  make clean        - Nettoyer les fichiers temporaires"
	@echo "  make docker-up    - Démarrer les services Docker"
	@echo "  make docker-down  - Arrêter les services Docker"

install:
	uv pip install -e .

dev:
	uv pip install -e ".[dev]"

db-init:
	python scripts/init_db.py

db-migrate:
	alembic revision --autogenerate -m "$(msg)"

db-upgrade:
	alembic upgrade head

run:
	uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test:
	pytest -v --cov=app --cov-report=html

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f

docker-restart:
	docker-compose restart
