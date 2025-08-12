// Script to create realistic test appointments and queue entries
const appointments = [
  {
    patientName: "Rajesh Kumar",
    doctorName: "Dr. Priya Sharma", 
    date: "2025-08-13",
    time: "09:00",
    symptoms: "Persistent cough and chest discomfort for 1 week",
    notes: "Patient reports dry cough, mild fever yesterday"
  },
  {
    patientName: "Anita Singh",
    doctorName: "Dr. Rajesh Patel",
    date: "2025-08-13", 
    time: "09:30",
    symptoms: "High blood pressure follow-up appointment",
    notes: "Regular BP monitoring, medication effectiveness check"
  },
  {
    patientName: "Mohammad Ali",
    doctorName: "Dr. Priya Sharma",
    date: "2025-08-13",
    time: "10:00", 
    symptoms: "Diabetes management and blood sugar monitoring",
    notes: "HbA1c results review, diet consultation needed"
  },
  {
    patientName: "Sunita Patel",
    doctorName: "Dr. Rajesh Patel",
    date: "2025-08-13",
    time: "10:30",
    symptoms: "Knee joint pain and mobility issues",
    notes: "Arthritis symptoms worsening, X-ray recommended"
  },
  {
    patientName: "Vikram Yadav", 
    doctorName: "Dr. Priya Sharma",
    date: "2025-08-13",
    time: "11:00",
    symptoms: "Annual health checkup and vaccination",
    notes: "Complete physical exam, flu shot due"
  },
  {
    patientName: "Priya Gupta",
    doctorName: "Dr. Rajesh Patel", 
    date: "2025-08-13",
    time: "14:00",
    symptoms: "Headaches and eye strain from computer work",
    notes: "Software engineer, reports daily headaches"
  }
];

console.log("Test appointments data ready for booking:");
console.log(JSON.stringify(appointments, null, 2));