POLP — Proof of Location Protocol
=========================================

POLP è un protocollo decentralizzato per la certificazione on-chain della posizione geografica di un utente, con validazione combinata tramite NFC e GPS.  
Integra un'infrastruttura Web3 per garantire che ogni interazione fisica sia dimostrabile, tracciabile e verificabile pubblicamente.

La tecnologia PAW (Proof of Activity Witnessing) è utilizzata come framework operativo e portale utente per gestire le visite, l’autenticazione e l’assegnazione di badge NFT come prova di presenza.

---

📌 Obiettivo del protocollo
----------------------------
Certificare su blockchain che un utente si sia trovato in un luogo fisico specifico in un dato momento, attraverso:

- Validazione NFC (prossimità)
- Validazione GPS (coordinate geografiche)
- Firma crittografica e salvataggio IPFS/IPNS
- Emissione NFT univoci come badge di presenza

---

🔧 Architettura del sistema
----------------------------

1. **Frontend (PAW Web App)**
   - React + TailwindCSS + shadcn/ui
   - Web NFC API per lettura tag NFC
   - Geolocation API per coordinate GPS
   - Web3Auth per login e wallet istantaneo
   - Redux Toolkit per la gestione degli stati
   - Interfaccia utente per vedere visite, badge e progressi

2. **Backend (Express.js)**
   - API RESTful per validazione e registrazione delle visite
   - Salvataggio dati su IPFS + versionamento con IPNS
   - Validazione coordinate con `geolib`
   - Analisi semantica delle visite tramite `faiss-node`
   - Firma e verifica dei dati per emissione NFT

3. **Blockchain**
   - Contratto `POLPBadge.sol` su Gnosis Chain (ERC-721)
   - Controllo delle claim NFT per utente e visita
   - Minting sicuro eseguito solo dal backend

---

📦 Tecnologie principali
-------------------------

**Backend**
- Node.js + Express.js
- Sequelize (ORM)
- PostgreSQL
- ipfs-http-client
- faiss-node
- ethers.js
- hardhat
- geolib

**Frontend**
- React 18
- TailwindCSS
- shadcn/ui
- Redux Toolkit
- Web NFC API
- Web Geolocation API
- Web3Auth
- Axios

**Smart Contract**
- Solidity
- Hardhat
- Gnosis Chain (per gas bassi ed EVM compatibile)

---

🧠 Come funziona il flusso di visita
------------------------------------

1. L’utente si autentica tramite Web3Auth (creazione wallet in 1 click).
2. Viene scansionato un tag NFC tramite Web NFC API.
3. Le coordinate GPS vengono acquisite via browser.
4. I dati vengono validati, hashati e salvati su IPFS.
5. L’hash viene firmato digitalmente e il CID salvato su IPNS.
6. Se valido e non già registrato, viene mintato un NFT Badge.
7. Tutto il processo è tracciabile e verificabile on-chain.


---

🐳 Esecuzione con Docker
------------------------

Il progetto è completamente containerizzato e può essere avviato facilmente tramite Docker Compose. Sono forniti Dockerfile specifici per backend (Node.js 22.13.1) e frontend (Node.js 22.13.1), oltre a un servizio PostgreSQL.

**Requisiti**
- Docker e Docker Compose installati
- Nessuna dipendenza locale richiesta: tutte le dipendenze (inclusi build-essential, faiss-node, ipfs, ecc.) sono gestite nei container

**Porte esposte**
- Backend API: `4000` (http://localhost:4000)
- Frontend: `4173` (http://localhost:4173)
- PostgreSQL: `5432` (solo per sviluppo, non esposto pubblicamente)

**Variabili d'ambiente**
- Le variabili d'ambiente possono essere definite nei file `.env` all'interno di `./backend` e `./frontend` (vedi i commenti nel `docker-compose.yml`).
- Per PostgreSQL, le credenziali di default sono:
  - `POSTGRES_USER=polp`
  - `POSTGRES_PASSWORD=polp`
  - `POSTGRES_DB=polp`

**Avvio rapido**
1. Clona il repository e posizionati nella root del progetto.
2. Avvia tutti i servizi:
   \```sh
   docker compose up --build
   \```
3. Accedi ai servizi:
   - Frontend: [http://localhost:4173](http://localhost:4173)
   - Backend API: [http://localhost:4000](http://localhost:4000)

**Note e configurazioni**
- I dati del database non sono persistenti di default. Per persistenza, decommenta la sezione `volumes` relativa a `postgres` nel `docker-compose.yml`.
- Puoi personalizzare le variabili d'ambiente creando i file `.env` nelle rispettive cartelle.
- Il backend e il frontend sono eseguiti come utenti non-root per maggiore sicurezza.

Per dettagli avanzati consulta i Dockerfile in `./backend` e `./frontend` e il file `docker-compose.yml`.

---

👷‍♂️ Stato del progetto
------------------------

🚧 Staging — Prototipo in sviluppo avanzato.  
Il codice è strutturato, documentato e pronto per test e miglioramenti iterativi.

---

📜 Licenza
----------

Questo progetto è open-source e rilasciato sotto licenza MIT.

---

Contatti e Collaborazioni
--------------------------

Per contribuire o proporre partnership, contattare: `dev@polp.space`
