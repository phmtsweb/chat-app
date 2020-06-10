const app = require('./app')
const http = require('http')
const socketio = require('./socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const server = http.createServer(app)
const port = process.env.PORT || 3000
const io = socketio(server)


io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', (options, callback) => {
        const { error, user } = addUser({
            id: socket.id,
            ...options
        })
        if (error) {
            return callback(error)
        }
        socket.join(user.room)


        socket.emit('message', generateMessage('Admin', `Welcome, ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()

    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()
        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed!')
        }
        const user = getUser(socket.id)
        if (user) {
            io.to(user.room).emit('message', generateMessage(user.username, message))
            callback()
        }

    })

    socket.on('sendLocation', (latitude, longitude, callback) => {
        const user = getUser(socket.id)
        if (user) {
            const mapURL = `https://google.com/maps?q=${latitude},${longitude}`
            io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, mapURL))
            callback()
        }

    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage(Admin, `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})


server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})