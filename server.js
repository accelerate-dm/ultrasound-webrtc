const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");
let dotenv = require("dotenv");
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store uploaded images in an array
let images = [];
let streamingActive = false;
let interval = null;
let clients = new Set();

// Multer setup for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static("public"));

// Handle image upload
app.post("/upload", upload.array("images"), (req, res) => {
    req.files.forEach(file => {
        images.push(`data:image/png;base64,${file.buffer.toString("base64")}`);
    });

    if (!streamingActive && images.length > 0) {
        startStreaming();
    }

    res.json({ success: true, message: "Images uploaded successfully!" });
});

// Function to start streaming images
function startStreaming() {
    let index = 0;
    streamingActive = true;
    
    io.emit("streamStart", { message: "Stream Started" });

    interval = setInterval(() => {
        if (clients.size === 0) {
            stopStreaming(); // Stop if no clients are connected
            return;
        }
        if (images.length > 0) {
            io.emit("frame", images[index]);
            index = (index + 1) % images.length;
        }
    }, 700);
}

// Function to stop streaming
function stopStreaming() {
    if (streamingActive) {
        streamingActive = false;
        clearInterval(interval);
        images = [];
        io.emit("streamStop", { message: "Stream Stopped" });
        console.log("Streaming stopped.");
    }
}

// Handle stop stream request from frontend
app.post("/stop-stream", (req, res) => {
    stopStreaming();
    res.json({ success: true, message: "Streaming stopped successfully!" });
});

// Handle socket connection
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    clients.add(socket.id);

    socket.on("stopStream", () => {
        stopStreaming();
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        clients.delete(socket.id);

        if (clients.size === 0) {
            stopStreaming();
        }
    });
});

// Start server
const PORT = process.env.PORT || 5555;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://<System-A-public-IP>:${PORT}`);
});
