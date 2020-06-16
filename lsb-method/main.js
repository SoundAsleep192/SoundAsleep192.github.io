var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const messageInput = document.getElementById('message'); // выбор элементов интерфейса со страницы
const encodeFileInput = document.getElementById('encodeFileInput');
const encodeButton = document.getElementById('encodeButton');
const downloadLink = document.createElement('a');
const decodeFileInput = document.getElementById('decodeFileInput');
const decodeButton = document.getElementById('decodeButton');
// названия функций говорят сами за себя, типы данных везде указаны
// я очень долго делал эту лабу и у меня наконец-то получилось
// я не хочу комментировать каждую строчку потому что в этом нет смысла и сейчас 5 утра и я очень хочу спать
encodeFileInput.addEventListener('change', () => __awaiter(this, void 0, void 0, function* () {
    const image = encodeFileInput.files[0];
    const imageBase64 = yield fileToBase64(image);
    const previewImage = new Image(250);
    previewImage.src = imageBase64;
    document.getElementById('preview').appendChild(previewImage);
}));
encodeButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
    if (!encodeFileInput.files.length)
        return;
    const image = encodeFileInput.files[0];
    const imageBase64 = yield fileToBase64(image);
    const imageData = yield base64ToImageData(imageBase64);
    const message = messageInput.value ? messageInput.value : 'Hello world';
    const encodedImageData = yield encodeMessageIntoImageData(message, imageData);
    downloadLink.href = imageDataToBase64(encodedImageData);
    downloadLink.download = 'encoded-' + image.name.match(/.+(?=\.)/gi)[0];
    downloadLink.textContent = 'Скачать зашифрованное изображение';
    document.getElementById('result').appendChild(downloadLink);
}));
decodeFileInput.addEventListener('change', () => __awaiter(this, void 0, void 0, function* () {
    const image = decodeFileInput.files[0];
    const imageBase64 = yield fileToBase64(image);
    const previewImage = new Image(250);
    previewImage.src = imageBase64;
    document.getElementById('preview2').appendChild(previewImage);
}));
decodeButton.addEventListener('click', () => __awaiter(this, void 0, void 0, function* () {
    if (!decodeFileInput.files.length)
        return;
    const image = decodeFileInput.files[0];
    const imageBase64 = yield fileToBase64(image);
    const imageData = yield base64ToImageData(imageBase64);
    const decodedMessage = decodeImageData(imageData);
    document.getElementById('result2').textContent = decodedMessage;
}));
function encodeMessageIntoImageData(message, imgData) {
    return __awaiter(this, void 0, void 0, function* () {
        const binaryMessage = yield messageToBinary(message); // и возвращает новое зашифрованное изображение
        const imagePixels = Array.from(imgData.data);
        let binaryMessageCounter = 0;
        for (let i = 0; i < imagePixels.length; i++) {
            if (((i + 1) % 4) === 0)
                continue; // не трогаем a-канал для совместимости с jpeg
            if (binaryMessageCounter > binaryMessage.length)
                break;
            let currentValue = imagePixels[i];
            let encodedValue = ((currentValue >> 1) << 1) | binaryMessage[binaryMessageCounter]; // ВОТ ТУТ собественно алгоритм шифрования отдельного бита пикселя
            imagePixels[i] = encodedValue;
            binaryMessageCounter++;
        }
        return new ImageData(new Uint8ClampedArray(imagePixels), imgData.width, imgData.height);
    });
}
function decodeImageData(imgData) {
    const imagePixels = Array.from(imgData.data);
    let messageBinaryLength = [];
    let binaryMessageCounter = 0;
    for (let i = 0; i < imagePixels.length; i++) {
        if (((i + 1) % 4) === 0)
            continue;
        if (binaryMessageCounter >= 32)
            break;
        const leastSignificantBit = imagePixels[i] & 1; // ВОТ ТУТ собственно формула расшифровки отдельного бита пикселя
        messageBinaryLength.push(leastSignificantBit);
        binaryMessageCounter++;
    }
    const messageLength = parseInt(messageBinaryLength.join(''), 2);
    const messageLengthOfBits = (messageLength * 8) + binaryMessageCounter;
    const messageAsBinary = [];
    for (let i = 42; i < imagePixels.length; i++) {
        if (((i + 1) % 4) === 0)
            continue;
        if (binaryMessageCounter >= messageLengthOfBits)
            break;
        const leastSignificantBit = imagePixels[i] & 1;
        messageAsBinary.push(leastSignificantBit);
        binaryMessageCounter++;
    }
    const messageCharCodes = [];
    for (let i = 0; i < messageAsBinary.length; i += 8) {
        const charCode = parseInt(messageAsBinary.slice(i, i + 8).join(''), 2);
        messageCharCodes.push(charCode);
    }
    let result = '';
    messageCharCodes.forEach(code => result += String.fromCharCode(code));
    return result;
}
function messageToBinary(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const messageArray = message.split('');
        const messageBlob = new Blob(messageArray);
        const messageCodesArray = Array.from(new Uint8Array(yield messageBlob.arrayBuffer()));
        const messageBinaryLength = messageCodesArray.length.toString(2).split('').map(value => +value); // конвертируем длину сообщения в массив битов
        const messageBinary32BitLength = (new Array(32)).fill(0); // создаем пустой массив 32-битный массив (из 32 нулей)
        messageBinaryLength.forEach((value, index) => messageBinary32BitLength[32 - messageBinaryLength.length + index] = value); // заполняем его битами длины
        const messageCodesBinary8BitArray = messageCodesArray.map(decimalToBinary8Bit); // превращаем массив десятеричных чисел в массив массивов нулей и единиц
        messageCodesBinary8BitArray.unshift(messageBinary32BitLength); // добавляем длину сообщения первым элементом
        const flattenedMessageBits = messageCodesBinary8BitArray.reduce((acc, val) => acc.concat(val), []); // ликвидируем вложенность массива, делаем его плоским
        console.log(flattenedMessageBits);
        return flattenedMessageBits;
    });
}
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}
function base64ToImageData(base64) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve(imageData);
        };
        img.onerror = () => reject();
        img.src = base64;
    });
}
function imageDataToBase64(imgData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
}
function decimalToBinary8Bit(num) {
    let binaryAsString = num.toString(2);
    while (binaryAsString.length < 8) {
        binaryAsString = '0' + binaryAsString;
    }
    let binaryAsNumberArray = binaryAsString.split('').map(value => +value);
    return binaryAsNumberArray;
}
