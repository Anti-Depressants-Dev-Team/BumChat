import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { app } from 'electron';

export function startWidgetServer() {
    const expressApp = express();
    const server = createServer(expressApp);
    const io = new Server(server, {
        cors: { origin: '*' }
    });

    const PORT = 8356;

    // Serve static files for widgets
    // In dev mode, they will be in public/widgets
    // In prod mode, they will be in dist/widgets
    const isDev = process.argv.includes('--dev');
    const widgetsDir = isDev
        ? path.join(app.getAppPath(), 'public', 'widgets')
        : path.join(app.getAppPath(), 'dist', 'widgets');

    expressApp.use('/widgets', express.static(widgetsDir));

    let onSendMessageCallback: ((data: { message: string; platform: string }) => void) | null = null;

    io.on('connection', (socket) => {
        console.log('OBS Widget connected:', socket.id);

        socket.on('send-message', (data: { message: string; platform: string }) => {
            console.log('Dock send-message:', data.platform, data.message);
            if (onSendMessageCallback) {
                onSendMessageCallback(data);
            }
        });

        socket.on('disconnect', () => {
            console.log('OBS Widget disconnected:', socket.id);
        });
    });

    server.listen(PORT, '127.0.0.1', () => {
        console.log(`BumChat Widget Server running at http://127.0.0.1:${PORT}`);
    });

    // Return a function to broadcast messages to all connected widgets
    return {
        broadcastMessage: (message: any) => {
            io.emit('chat-message', message);
        },
        broadcastViewerCount: (counts: any) => {
            io.emit('viewer-count', counts);
        },
        onSendMessage: (callback: (data: { message: string; platform: string }) => void) => {
            onSendMessageCallback = callback;
        }
    };
}
