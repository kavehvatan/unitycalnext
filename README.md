# UnityCal Next (Next.js API)

This is a minimal Next.js project exposing the Unity Calculator API at `/api/unity-calculator`.

## Run locally
```bash
npm install
npm run dev
```

## Deploy on Render
- Build: `npm install && npm run build`
- Start: `npm start`
- Node: >=20 (set via engines and .nvmrc)
```

## Example request
```bash
curl -X POST http://localhost:3000/api/unity-calculator   -H "Content-Type: application/json"   -d '{"disk":"600GB","raid":"RAID5","set":"4+1","count":25,"sparePolicy":"1/30"}'
```
