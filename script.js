const messages = [
    "やっほ〜꜀(^- ̫-^꜀  )੭",
    "にゃぬ(^•ﻌ•^)",
    "ごろごろ〜(=^･ω･^=)",
];

document.getElementById("btn").addEventListener("click", () => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    document.getElementById("message").textContent = messages[randomIndex];
});

document.getElementById("btn2").addEventListener("click", () => {
    document.getElementById("message2").textContent = "大吉やじょ〜♡";
    
});
