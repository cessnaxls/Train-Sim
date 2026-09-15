import express from "express";
import path from "path";
import {fileURLToPath} from "url";
const app=express(); const __dirname=path.dirname(fileURLToPath(import.meta.url));
app.get("/api/config",(req,res)=>res.json({googleMapTilesKey:process.env.GOOGLE_MAP_TILES_API_KEY||process.env.GOOGLE_MAPS_API_KEY||""}));
app.use(express.static(path.join(__dirname,"dist"),{maxAge:"1h"}));
app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"dist","index.html")));
app.listen(process.env.PORT||10000,()=>console.log("WorldRail online"));
