let conversationHistory = [];
let vocabularyLearned = {}; 
let timerInterval;
let timeLeft = 2 * 60 * 60; // 2 hours in seconds

// 🎯 Custom System Instructions for slang conversions
const SYSTEM_INSTRUCTION = `
You are a cool, casual AI podcast co-host who teaches slang and idioms naturally. 
Keep responses brief (2-3 sentences max). 

CRITICAL RULE 1: You MUST inject exactly one slang word or idiom into every single response.
CRITICAL RULE 2: NEVER wrap your response in markdown code blocks, backticks (\`\`\`), or pre-formatted text tags. Reply only in plain text.

CRITICAL FORMATTING: Whenever you use a slang word or idiom, you must immediately attach the definition directly after it using the exact format: [slang: WORD | DEFINITION]. 

Example phrase upgrade: If someone says they "watched their phone", you must say: You were totally [slang: glued to your phone | deeply focused on looking at your screen for a long time]!

Example flow:
User: hi
Model: Yo! What's good? Ready to drop some [slang: fire | really excellent or exciting] slang today? What have you been up to?

Never omit the brackets. Every response must contain exactly one [slang: word | definition] tag. Do not define words outside of the brackets.
`;

const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const endBtn = document.getElementById('end-btn');
const timerDisplay = document.getElementById('timer');
const podcastContainer = document.getElementById('podcast-container');
const summaryContainer = document.getElementById('summary-container');

// Start countdown immediately
startTimer();

// 🤫 Secret Easter Egg Configuration: Ctrl + 0 + P
let keysPressed = {};

window.addEventListener('keydown', (e) => {
    const keyLower = e.key.toLowerCase();
    keysPressed[keyLower] = true;

    // Activates if Ctrl is held, and either row-0, numpad-0, and P are triggered together
    if (e.ctrlKey && (keysPressed['0'] || keysPressed['num0']) && keysPressed['p']) {
        e.preventDefault(); 
        
        document.getElementById('admin-vault').classList.toggle('hidden');
        
        // Clear immediately to prevent UI flickering loop
        keysPressed['0'] = false;
        keysPressed['num0'] = false;
        keysPressed['p'] = false;
    }
});

window.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// Admin Vault Save Action
document.getElementById('save-master-btn').addEventListener('click', () => {
    const key = document.getElementById('master-key-input').value.trim();
    if(key) {
        localStorage.setItem('shared_gemini_key', btoa(key)); 
        alert("Master key securely updated for this application!");
        document.getElementById('admin-vault').classList.add('hidden');
    }
});

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage("You", text, "user-bubble");
    userInput.value = "";
    conversationHistory.push({ role: "user", parts: [{ text: text }] });

    const typingBubble = appendMessage("Gemini", "Thinking...", "ai-bubble");

    // Automatically check visitor's browser memory for the saved master key
    const targetKey = atob(localStorage.getItem('shared_gemini_key') || "");
    if (!targetKey) {
        typingBubble.textContent = "System configuration missing. (Admin: Press Ctrl + 0 + P to unlock system console)";
        return;
    }

    try {
        // 🚀 MODEL UPDATED TO GEMINI-2.5-FLASH FOR PRODUCTION
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${targetKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: conversationHistory,
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
            })
        });

        const data = await response.json();
        const rawReply = data.candidates[0].content.parts[0].text;
        
        const cleanedReply = parseAndStoreSlang(rawReply);
        typingBubble.innerHTML = `<strong>Gemini:</strong> ${cleanedReply}`;
        conversationHistory.push({ role: "model", parts: [{ text: rawReply }] });
        chatWindow.scrollTop = chatWindow.scrollHeight;

    } catch (error) {
        typingBubble.textContent = "Oops! Gemini ran into a tiny glitch. Try again.";
    }
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSend(); });

function parseAndStoreSlang(text) {
    const regex = /\[slang:\s*([^|]+)\s*\|\s*([^\]]+)\]/g;
    let match;
    let newText = text;
    while ((match = regex.exec(text)) !== null) {
        const word = match[1].trim();
        const definition = match[2].trim();
        vocabularyLearned[word] = definition;
        newText = newText.replace(match[0], `<span class="slang-word" onclick="alert('${word}: ${definition}')">${word}</span>`);
    }
    return newText;
}

function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) { clearInterval(timerInterval); endPodcast(); }
        let hrs = Math.floor(timeLeft / 3600).toString().padStart(2, '0');
        let mins = Math.floor((timeLeft % 3600) / 60).toString().padStart(2, '0');
        let secs = (timeLeft % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${hrs}:${mins}:${secs}`;
    }, 1000);
}

function endPodcast() {
    clearInterval(timerInterval);
    podcastContainer.classList.add('hidden');
    summaryContainer.classList.remove('hidden');
    const listElement = document.getElementById('slang-summary-list');
    listElement.innerHTML = "";
    Object.keys(vocabularyLearned).forEach(word => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${word}</strong>: ${vocabularyLearned[word]}`;
        listElement.appendChild(li);
    });
}
endBtn.addEventListener('click', endPodcast);

function appendMessage(sender, text, className) {
    const div = document.createElement('p');
    div.className = className;
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    chatWindow.appendChild(div);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return div;
}
