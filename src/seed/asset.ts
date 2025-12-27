import prisma from "../lib/prisma.js";
export const assets =  [{
        id: 1,
        symbol: "BTC",
        name: "Bitcoin",
        imageUrl: "https://bitcoin.org/img/icons/logotop.svg?1749679667"
    }, {
        id: 2,
        symbol: "ETH",
        name: "Ethereum",
        imageUrl: "https://ethereum.org/favicon.ico"
    }, {
        id: 3,
        symbol: "SOL",
        name: "Solana",
        imageUrl: "https://solana.com/favicon.svg"
}]

//do npx prisma generate to update prisma client functions with existing database schema after migration
async function assetSeeding(){
    assets.forEach(async (asset)=>{
        await prisma.asset.create({
            data: {
                id: asset.id,
                symbol: asset.symbol,
                name: asset.name,
                imageUrl: asset.imageUrl,
                decimals: 4,
            }
        })
    })
};

// await assetSeeding();
console.log("Asset Seeding Successful");
