
import { UserData, InterviewResult } from '../types';
import { jsPDF } from 'jspdf';

const BOT_TOKEN = '7878047212:AAFtWO7f6Ws2sYHqHSviasJUOy7cO11lZ4o';
const CHAT_ID = '5025112538';

export const sendToTelegram = async (userData: UserData, result: InterviewResult) => {
  // 1. Create a detailed summary message
  const textMessage = `
🎓 *AWS Networking Interview Report*
----------------------------------
👤 *Candidate:* ${userData.name}
📧 *Email:* ${userData.email}
📱 *Phone:* ${userData.phone}

📊 *Final Score:* ${result.score}%
✅ *Questions Answered:* ${result.questionsAnswered}

🌟 *Strengths:*
${result.strengths.map(s => `• ${s}`).join('\n')}

⚠️ *Weaknesses:*
${result.weaknesses.map(w => `• ${w}`).join('\n')}

📝 *Feedback:*
_${result.feedback}_
  `;

  // Send the summary text message
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: textMessage,
      parse_mode: 'Markdown',
    }),
  });

  // 2. Generate PDF using jsPDF
  const doc = new jsPDF();
  
  // PDF Header
  doc.setFillColor(249, 115, 22); // AWS Orange
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("AWS ARCHITECTURE ASSESSMENT", 20, 25);
  
  // Candidate Info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.text("Candidate Dossier", 20, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${userData.name}`, 20, 60);
  doc.text(`Email: ${userData.email}`, 20, 67);
  doc.text(`Mobile: ${userData.phone}`, 20, 74);
  doc.text(`Date: ${new Date().toLocaleString()}`, 20, 81);
  
  // Result Summary
  doc.setFont("helvetica", "bold");
  doc.text("Performance Metrics", 20, 95);
  doc.setFontSize(30);
  doc.setTextColor(249, 115, 22);
  doc.text(`${result.score}%`, 20, 110);
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Total Evaluation Score", 20, 115);
  
  // Feedback
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", 20, 130);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const splitFeedback = doc.splitTextToSize(result.feedback, 170);
  doc.text(splitFeedback, 20, 140);
  
  // Strengths & Weaknesses
  let currentY = 140 + (splitFeedback.length * 5) + 10;
  
  doc.setFont("helvetica", "bold");
  doc.text("Technical Proficiencies", 20, currentY);
  currentY += 7;
  doc.setFont("helvetica", "normal");
  result.strengths.forEach(s => {
    doc.text(`• ${s}`, 25, currentY);
    currentY += 5;
  });
  
  currentY += 5;
  doc.setFont("helvetica", "bold");
  doc.text("Area of Improvements", 20, currentY);
  currentY += 7;
  doc.setFont("helvetica", "normal");
  result.weaknesses.forEach(w => {
    doc.text(`• ${w}`, 25, currentY);
    currentY += 5;
  });

  // Convert PDF to Blob
  const pdfBlob = doc.output('blob');
  
  // 3. Send PDF document via Telegram
  const formData = new FormData();
  formData.append('chat_id', CHAT_ID);
  formData.append('document', pdfBlob, `${userData.name.replace(/\s+/g, '_')}_AWS_Assessment.pdf`);
  formData.append('caption', `Attached: Official AWS Networking Technical Evaluation for ${userData.name}`);

  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
    method: 'POST',
    body: formData,
  });
};
