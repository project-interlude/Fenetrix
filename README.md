# FENETRIX // HARDSTYLE KICK SYNTHESIZER
**A Project Interlude Audio DSP Application**

Fenetrix is a brutal, web-based Hardstyle Kick Generator designed with a dark, industrial hardware aesthetic. It operates directly in your browser using the Web Audio API, allowing you to synthesize kicks with uncompromising distortion, precision EQ, and deep sub-bass manipulation. 

## 🎛️ Features

* **Hardware-Style Interface:** A meticulously designed UI featuring zero border radii, harsh stark contrasts, and modular tracking that mimics high-end outboard gear and boutique VST plugins.
* **4-Stage Synthesis Algorithms:**
  * **TYPE A:** Aggressive / Hard (Gated)
  * **TYPE B:** Melodic / Clean (Euphoric)
  * **TYPE C:** Overdriven / Raw (Zaag)
  * **TYPE D:** Sucking / Swell (Reverse)
* **Live Visualizers:** Built-in Oscilloscope (WAV) and Spectrum Analyzer (FFT) for real-time acoustic feedback.
* **A/B Comparison:** Seamlessly swap between two different kick patches to reference and A/B test your sound design changes.
* **Advanced Output Stage:** Monitor your RMS and Peak levels to ensure your kicks hit perfectly without unwanted clipping.
* **WAV Export:** Instantly bounce your generated kick drums to high-quality 24-bit WAV files for use in your DAW of choice.

## 🛠️ Tech Stack

* **Frontend Framework:** React 18, Vite, TypeScript
* **Styling:** Tailwind CSS, shadcn/ui components (Customized for an industrial theme)
* **Audio Engine:** Native Web Audio API for low-latency DSP
* **Icons:** Lucide React

## 🚀 Quick Start

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher recommended) installed on your machine.

### Installation

1. **Navigate to the project directory:**
   `cd path/to/project-interlude/fenetrix`

2. **Install dependencies:**
   `npm install`

### Running Locally

To start the local development server:
`npm run dev`

The application will spin up (usually on `http://localhost:5000` or `http://localhost:5173`). Open that URL in your web browser.

### Building for Production

To create an optimized static build for deployment:
`npm run build`

The compiled files will be output to the `dist` folder, ready to be hosted on Vercel, Netlify, or any static hosting provider.

## 🎧 Usage Guide

1. **Initialize Engine:** Click the Play/Trigger button in the top transport section to hear the default kick.
2. **Select Algorithm:** Choose your base kick style from **Module I: Algorithm Selection** (Type A, B, C, or D).
3. **Sculpt the Sound:** Use **Module II: Core Parameters** to adjust pitch envelopes, distortion drive, EQ, and transient clicks.
4. **Compare:** Tweak a sound, then hit the `[B]` button in the top right "Compare" section to hold that state. Switch back to `[A]` to create a variation and rapidly swap between them.
5. **Export:** Once you are happy with the destructive capabilities of your kick, click the download icon in the transport controls to instantly save your `.wav` file.

---
**PROJECT INTERLUDE** // SEQ. 001 // SYSTEM ACTIVE
