// const socket = io('ws://localhost:5002')
const socket = io();

function sendMessage(e) {
    e.preventDefault();

    const message = document.getElementById('message');
    const fileInput = document.getElementById('file');

    if (message.value) {
        const messageData = {
            text: message.value,
            username: currentUser.username,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date().toLocaleDateString()
        };

        socket.emit('message', messageData);

        appendMessage(messageData, true);

        message.value = "";
    }

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0]; // Get the first selected file
        const reader = new FileReader(); // Create a FileReader to read the file

        reader.onload = function(event) {
            const fileData = {
                name: file.name,
                type: file.type,
                file: event.target.result, // The file data as a base64 string
                username: currentUser.username,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                date: new Date().toLocaleDateString()
            };

            socket.emit('upload', fileData);

            appendFile(fileData, true);

            fileInput.value = '';

        };

        reader.readAsArrayBuffer(file); // Read the file as an ArrayBuffer
    }

    message.focus()
}

document.getElementById('chat-form').addEventListener('submit', sendMessage);

// Listen for messages 
socket.on("message", (data) => {
    if (data.username !== currentUser.username) {
        if (data.file) {
            // console.log('file!!');
            appendFile(data);
        } else {
            appendMessage(data);
        }
    }
});

// Append message to chat box
function appendMessage(data, isSentByUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('d-flex', 'flex-row', isSentByUser ? 'justify-content-end' : 'justify-content-start');

    const contentDiv = document.createElement('div');

    if (isSentByUser) {
        const usernameParagraph = document.createElement('p');
        usernameParagraph.classList.add('text-muted', 'text-end', 'mb-0');
        usernameParagraph.textContent = currentUser.username; // Ensure currentUser is defined
        contentDiv.appendChild(usernameParagraph);
    } else {
        // If the message is received, add the username to the message
        const usernameParagraph = document.createElement('p');
        usernameParagraph.classList.add('text-muted', 'text-start', 'mb-0');
        usernameParagraph.textContent = data.username; // Use the username from the received data
        contentDiv.appendChild(usernameParagraph);
    }

    const messageParagraph = document.createElement('p');
    messageParagraph.classList.add(
        'p-2',
        'mb-1',
        'rounded-3',
        ...(isSentByUser ? ['text-white', 'bg-primary'] : ['bg-body-tertiary']) // Spread operator to conditionally add classes
    );
    messageParagraph.textContent = data.text; // Message text

    const timestampParagraph = document.createElement('p');
    timestampParagraph.classList.add('small', 'mb-3', 'text-muted', isSentByUser ? 'float-start' : 'float-end');
    timestampParagraph.textContent = `${data.time} | ${data.date}`; // todo, get rid of seconds

    contentDiv.appendChild(messageParagraph);
    contentDiv.appendChild(timestampParagraph);

    messageDiv.appendChild(contentDiv);

    document.querySelector('.chat-container').appendChild(messageDiv);
}

// Append file message to chat box
function appendFile(data, isSentByUser = false) {
    // console.log(data);
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('d-flex', 'flex-row', isSentByUser ? 'justify-content-end' : 'justify-content-start');

    const contentDiv = document.createElement('div');

    // Display the username if the message is from the user
    if (isSentByUser) {
        const usernameParagraph = document.createElement('p');
        usernameParagraph.classList.add('text-muted', 'text-end', 'mb-0');
        usernameParagraph.textContent = data.username;
        contentDiv.appendChild(usernameParagraph);
    }

    const fileMessageParagraph = document.createElement('p');
    fileMessageParagraph.classList.add(
        'p-2',
        'mb-1',
        'rounded-3',
        ...(isSentByUser ? ['text-white', 'bg-primary'] : ['bg-body-tertiary']) // Spread operator to conditionally add classes
    );

    // Check if the file is an image
    if (data.type.startsWith('image/')) {
        const img = document.createElement('img');
        img.src = `/download/${data.name}`;
        img.style.width = '100px';
        img.style.height = 'auto';
        fileMessageParagraph.appendChild(img);
    } else {
        // For other file types, create a download link
        const link = document.createElement('a');
        link.href = `/download/${data.name}`;
        link.textContent = `Download ${data.name}`;
        link.target = '_blank';
        link.classList.add('text-muted');
        fileMessageParagraph.appendChild(link);
    }

    const timestampParagraph = document.createElement('p');
    timestampParagraph.classList.add('small', 'mb-3', 'rounded-3', 'text-muted', isSentByUser ? 'float-start' : 'float-end');
    timestampParagraph.textContent = `${data.time} | ${data.date}`;

    // Append the elements to contentDiv and messageDiv
    contentDiv.appendChild(fileMessageParagraph);
    contentDiv.appendChild(timestampParagraph);

    messageDiv.appendChild(contentDiv);

    // Append the messageDiv to the chat container
    document.querySelector('.chat-container').appendChild(messageDiv);
}

