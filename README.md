# 3v3 Draft Tool

A real-time web application for managing 3v3 tournament drafts with ban phases, developed for the W2A Tournament staff.

## 🚀 Features

- **Real-time Draft Management**: Live WebSocket-based drafting system
- **Team Configuration**: Customizable team names and ban settings
- **Flexible Timing**: Configurable time limits for picks and bans
- **Multi-role Support**: Separate URLs for each team and spectators
- **Modern UI**: Responsive design with gradient styling and smooth animations
- **Tournament Ready**: Built specifically for competitive 3v3 tournaments

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** with React 19
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **FontAwesome** for icons
- **WebSocket** for real-time communication

### Backend
- **Go 1.25** with Gorilla WebSocket
- **In-memory storage** for active drafts
- **RESTful WebSocket API**

## 🏗️ Project Structure

```
picks3/
├── frontend/           # Next.js React application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── hooks/     # Custom React hooks
│   │   ├── types/     # TypeScript definitions
│   │   └── utils/     # Utility functions
│   └── public/        # Static assets
└── backend/           # Go WebSocket server
    ├── cmd/server/    # Application entry point
    ├── internal/      # Internal packages
    │   ├── handlers/  # WebSocket handlers
    │   ├── models/    # Data models
    │   └── services/  # Business logic
    └── pkg/           # Public packages
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Go 1.25+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/3v3-draft-tool.git
   cd 3v3-draft-tool
   ```

2. **Start the backend server**
   ```bash
   cd backend
   go mod tidy
   go run cmd/server/main.go
   ```

3. **Start the frontend development server**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Open [http://localhost:3000](http://localhost:3000) in your browser
   - The WebSocket server runs on port 8080 by default

## 📖 Usage

1. **Create a Draft Room**
   - Configure team names, timing, and ban settings
   - Click "Start Draft" to create a new room

2. **Share URLs**
   - Blue Team URL: For blue team members to make picks/bans
   - Red Team URL: For red team members to make picks/bans  
   - Spectator URL: For observers to watch the draft

3. **Manage the Draft**
   - Teams use their respective URLs to participate
   - Real-time updates for all participants
   - Automatic phase transitions based on timer settings

## ⚠️ Current Limitations

- **Memory Storage**: Drafts are stored in RAM only. For production use with high volume, consider implementing database storage for completed drafts to prevent memory leaks.
- **No Persistence**: Draft data is lost on server restart

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is developed for the W2A Tournament. Please contact the maintainers for licensing information.

## 👥 Credits

- Paula **"Latra"** Gallucci
- My favorite junior: [Claude 4](https://claude.ai/)
---

*Built with ❤️ for competitive 3v3 tournaments*
