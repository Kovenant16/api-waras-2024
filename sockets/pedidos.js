export default (io) => {
    io.on('connection', socket => {

        console.log('Nueva conexión', socket.id)

        const emitPedidos = async () => {
            io.emit('server:loadpedidos', 'pedidos')
            console.log("pedidos emitidos");
        }
        emitPedidos()

        socket.on('client:newpedido', () => {
            emitPedidos()
        })
    })
}