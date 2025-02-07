const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const multer = require("multer");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*", // Allow any system to connect (System B)
        methods: ["GET", "POST"]
    }
});

// Store uploaded images in an array (for simplicity)
let images = [];

// Multer setup for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve frontend files only for System A
app.use(express.static("public"));

// Endpoint to handle image upload (Only on System A)
app.post("/upload", upload.array("images"), (req, res) => {
    req.files.forEach(file => {
        images.push(`data:image/png;base64,${file.buffer.toString("base64")}`);
    });

    // Notify all connected clients that streaming has started
    io.emit("streamStart", { message: "Stream Started" });

    res.json({ success: true, message: "Images uploaded successfully!" });
});

// Socket.io connection handling
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);

    let index = 0;
    const interval = setInterval(() => {
        if (images.length > 0) {
            // Emit frames to all connected clients (including System B)
            io.emit("frame", images[index]);
            index = (index + 1) % images.length;
        }
    }, 700); // Send a new frame every 500ms (2 FPS)

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        clearInterval(interval);
    });
});

// Start the server
const PORT = process.env.PORT || 5555;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://<System-A-public-IP>:${PORT}`);
});
