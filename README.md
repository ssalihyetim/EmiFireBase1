# Euro Metal Docs - Manufacturing & Quality Management System

A comprehensive manufacturing management system built with Next.js 14, TypeScript, and Firebase, designed specifically for precision machining companies operating under AS9100D aerospace quality standards.

## 🚀 Features

### Quality Management System (AS9100D Compliant)
- **4-Level Document Hierarchy**: Manual, Policies, Procedures, Work Instructions
- **Quality Records Management**: Continuous logs and one-time forms
- **Template Integration**: 150+ quality documents with full AS9100D traceability
- **Real-time Compliance Tracking**: Automated quality metrics and reporting

### Manufacturing Operations
- **Offer Management**: Complete lifecycle from creation to acceptance
- **Order Processing**: Active order tracking with detailed item management
- **Job Management**: Individual production jobs derived from orders
- **Process Tracking**: 23+ manufacturing processes including turning, milling, 5-axis, grinding, anodizing

### Business Management
- **Client & Supplier Balance Tracking**: Real-time financial status monitoring
- **Multi-language Support**: English and Turkish localization
- **Document Generation**: PDF exports for offers and quality documentation
- **Attachment Management**: Secure file storage and retrieval

## 🛠 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **File Storage**: Firebase Storage
- **State Management**: React Hook Form + Zod validation
- **Internationalization**: next-intl

## 📋 Manufacturing Processes Supported

- Procurement, Turning, 3-Axis/4-Axis/5-Axis Milling
- Coating, Heat Treatment, Anodizing, Grinding
- Laser Cutting, Bending, Welding, Assembly
- Inspection, EDM, Shot Peening, Passivation
- And more...

## 🚧 Upcoming Features

- **Automatic Task Generation**: Smart task and subtask creation based on manufacturing processes
- **Quality Template Integration**: Seamless linking between tasks and AS9100D templates
- **Advanced Workflow Management**: Kanban-style task boards and progress tracking
- **Enhanced Reporting**: Comprehensive quality and production analytics

## 🔧 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/salihyetim/euro-metal-docs.git
cd euro-metal-docs
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
# Add your Firebase configuration
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── components/          # Reusable UI components
├── lib/                # Utilities and configurations
├── types/              # TypeScript type definitions
├── config/             # Application configuration
└── hooks/              # Custom React hooks
```

## 🏭 AS9100D Quality System

This system implements a complete AS9100D quality management framework:

- **Level A**: Quality Manual & Policies
- **Level B**: Core Procedures (40+ procedures)
- **Level C**: Work Instructions (25+ instructions)  
- **Level D1**: Continuous Logs (25+ log types)
- **Level D2**: One-time Forms (30+ form types)

## 🤝 Contributing

This is a specialized manufacturing management system. For feature requests or bug reports, please open an issue.

## 📄 License

This project is proprietary software developed for Euro Metal CNC Machining operations.

---

**Built for precision manufacturing excellence** ⚙️✨
