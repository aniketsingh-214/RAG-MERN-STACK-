.PHONY: help setup dev docker-up docker-down docker-logs clean

help:
	@echo "  make setup       Install all dependencies"
	@echo "  make docker-up   Build and start via Docker Compose"
	@echo "  make docker-down Stop Docker stack"
	@echo "  make clean       Remove node_modules and Python artifacts"

setup:
	cd backend/api-gateway && npm install
	cd backend/rag-connector && npm install
	cd frontend && npm install
	cd rag-service && pip install -r requirements.txt

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

clean:
	rm -rf backend/api-gateway/node_modules
	rm -rf backend/rag-connector/node_modules
	rm -rf frontend/node_modules
	find rag-service -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
