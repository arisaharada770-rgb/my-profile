const messages = [
    "やっほ〜꜀(^- ̫-^꜀  )੭",
    "にゃぬฅ^•ﻌ•^ฅ",
    "ごろごろ〜(=^･ω･^=)",
];

document.getElementById("btn").addEventListener("click", () => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    document.getElementById("message").textContent = messages[randomIndex];
});

document.getElementById("btn").addEventListener("click", () => {
    document.getElementById("message2").textContent = "大吉やじょ〜♡";
    
});
