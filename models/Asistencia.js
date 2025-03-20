import mongoose from "mongoose";

const TimeRecordSchema = mongoose.Schema({
    checkIn: {
        type: Date,
        required: true
    },
    checkOut: {
        type: Date,
        required: false // Permite que inicialmente sea null hasta que se registre la salida
    }
});

const AttendanceSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Usuario",
            required: true
        },
        date: {
            type: Date,
            required: true,
            default: Date.now
        },
        records: [TimeRecordSchema]
    },
    {
        timestamps: true // Agrega campos createdAt y updatedAt automáticamente
    }
);

const Attendance = mongoose.model("Attendance", AttendanceSchema);
export default Attendance;
