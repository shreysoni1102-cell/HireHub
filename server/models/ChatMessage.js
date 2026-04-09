import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema(
  {
    roomId:     { type: String, required: true, index: true }, // applicationId
    senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, enum: ['user', 'recruiter'], required: true },
    text:       { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

export default mongoose.model('ChatMessage', chatMessageSchema);
