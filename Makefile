# Calcio SQL - Makefile
# Comandi rapidi per gestire l'applicazione

.PHONY: help start stop restart logs build clean db-shell db-backup install

# Default: mostra help
help:
	@echo "╔════════════════════════════════════════════════════════╗"
	@echo "║            CALCIO SQL - Comandi Disponibili           ║"
	@echo "╚════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "Comandi principali:"
	@echo "  make start      - Avvia tutti i servizi"
	@echo "  make stop       - Ferma tutti i servizi"
	@echo "  make restart    - Riavvia tutti i servizi"
	@echo "  make logs       - Visualizza log in tempo reale"
	@echo "  make build      - Ricostruisci i container"
	@echo "  make clean      - Ferma e rimuovi tutto (inclusi volumi)"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell   - Apri shell PostgreSQL"
	@echo "  make db-backup  - Crea backup del database"
	@echo ""
	@echo "Altro:"
	@echo "  make install    - Installa dipendenze backend"
	@echo ""

# Avvia i servizi
start:
	@echo "🚀 Avvio Calcio SQL..."
	docker-compose up -d
	@echo "✅ Servizi avviati!"
	@echo "📱 Apri http://localhost:3000 nel browser"

# Ferma i servizi
stop:
	@echo "🛑 Fermando i servizi..."
	docker-compose down
	@echo "✅ Servizi fermati"

# Riavvia i servizi
restart:
	@echo "🔄 Riavvio servizi..."
	docker-compose restart
	@echo "✅ Servizi riavviati"

# Visualizza log
logs:
	docker-compose logs -f

# Ricostruisci i container
build:
	@echo "🔨 Ricostruisco i container..."
	docker-compose build --no-cache
	@echo "✅ Build completata"

# Pulizia completa
clean:
	@echo "🧹 Pulizia completa..."
	@echo "⚠️  ATTENZIONE: Questo rimuoverà anche i dati del database!"
	@read -p "Sei sicuro? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "✅ Pulizia completata"; \
	else \
		echo "❌ Operazione annullata"; \
	fi

# Shell PostgreSQL
db-shell:
	@echo "📊 Apertura shell PostgreSQL..."
	docker-compose exec db psql -U calcio_user -d calcio_sql

# Backup database
db-backup:
	@echo "💾 Creazione backup database..."
	@mkdir -p backups
	docker-compose exec -T db pg_dump -U calcio_user calcio_sql > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup creato in backups/"

# Installa dipendenze
install:
	@echo "📦 Installazione dipendenze..."
	cd backend && npm install
	@echo "✅ Dipendenze installate"
