const encodeFileInput = <HTMLInputElement>document.getElementById('encodeFileInput');
const downloadLink = document.createElement('a');
const messageInput = <HTMLInputElement>document.getElementById('message');
messageInput.value = 'Hello world';
const decodeFileInput = <HTMLInputElement>document.getElementById('decodeFileInput');

encodeFileInput.addEventListener('change', async () => {
  const image = encodeFileInput.files[0];
  const imageBase64 = await fileToBase64(image);
  const imageData = await base64ToImageData(imageBase64);

  const message = messageInput.value ? messageInput.value : 'Hola Mundo';

  const encodedImageData = await encodeMessageIntoImageData(message, imageData);

  downloadLink.href = imageDataToBase64(encodedImageData);
  downloadLink.download = 'encoded-' + image.name.match(/.+(?=\.)/gi)[0];
  downloadLink.textContent = 'Download image';
  document.body.appendChild(downloadLink);
});

decodeFileInput.addEventListener('change', async () => {
  const image = decodeFileInput.files[0];
  const imageBase64 = await fileToBase64(image);
  const imageData = await base64ToImageData(imageBase64);

  const decodedMessage = decodeImageData(imageData);
  console.log(decodedMessage);
});

async function encodeMessageIntoImageData(message: string, imgData: ImageData): Promise<ImageData> {
  const binaryMessage = await messageToBinary(message);

  const imagePixels = Array.from(imgData.data);

  let binaryMessageCounter = 0;

  for (let i = 0; i < imagePixels.length; i++) {
    if (((i + 1) % 4) === 0) continue; // не трогаем a-канал для совместимости с jpeg
    if (binaryMessageCounter > binaryMessage.length) break;
    let currentValue = imagePixels[i];
    let encodedValue = ((currentValue >> 1) << 1) | binaryMessage[binaryMessageCounter];
    imagePixels[i] = encodedValue;
    binaryMessageCounter++;
  }

  return new ImageData(new Uint8ClampedArray(imagePixels), imgData.width, imgData.height);
}

function decodeImageData(imgData: ImageData): string {
  const imagePixels = Array.from(imgData.data);

  let messageBinaryLength: number[] = [];
  let binaryMessageCounter = 0;

  for (let i = 0; i < imagePixels.length; i++) {
    if (((i + 1) % 4) === 0) continue;
    if (binaryMessageCounter >= 32) break;
    const leastSignificantBit = imagePixels[i] & 1;
    messageBinaryLength.push(leastSignificantBit);
    binaryMessageCounter++;
    console.log(i);
  }

  const messageLength = parseInt(messageBinaryLength.join(''), 2);

  const messageLengthOfBits = (messageLength * 8) + binaryMessageCounter;

  const messageAsBinary: number[] = [];

  for (let i = 42; i < imagePixels.length; i++) {
    if (((i + 1) % 4) === 0) continue;
    if (binaryMessageCounter >= messageLengthOfBits) break;
    const leastSignificantBit = imagePixels[i] & 1;
    messageAsBinary.push(leastSignificantBit);
    binaryMessageCounter++;
  }

  const messageCharCodes: number[] = [];

  for (let i = 0; i < messageAsBinary.length; i += 8) {
    const charCode = parseInt(messageAsBinary.slice(i, i + 8).join(''), 2);
    messageCharCodes.push(charCode);
  }

  let result = '';

  messageCharCodes.forEach(code => result += String.fromCharCode(code));

  return result;
}

async function messageToBinary(message: string): Promise<number[]> {
  const messageArray = message.split('');

  const messageBlob = new Blob(messageArray);

  const messageCodesArray = Array.from(new Uint8Array(await messageBlob.arrayBuffer()));

  const messageBinaryLength = messageCodesArray.length.toString(2).split('').map(value => +value); // конвертируем длину сообщения в массив битов
  const messageBinary32BitLength: number[] = (new Array(32)).fill(0); // создаем пустой массив 32-битный массив (из 32 нулей)
  messageBinaryLength.forEach((value, index) => messageBinary32BitLength[32 - messageBinaryLength.length + index] = value); // заполняем его битами длины

  const messageCodesBinary8BitArray = messageCodesArray.map(decimalToBinary8Bit); // превращаем массив десятеричных чисел в массив массивов нулей и единиц
  messageCodesBinary8BitArray.unshift(messageBinary32BitLength); // добавляем длину сообщения первым элементом

  const flattenedMessageBits = messageCodesBinary8BitArray.reduce((acc, val) => acc.concat(val), []); // ликвидируем вложенность массива, делаем его плоским

  console.log(flattenedMessageBits);

  return flattenedMessageBits;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(<string>reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function base64ToImageData(base64: string): Promise<ImageData> {
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
    }
    img.onerror = () => reject();
    img.src = base64;
  });
}

function imageDataToBase64(imgData: ImageData): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgData.width;
  canvas.height = imgData.height;
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

function decimalToBinary8Bit(num: number): number[] {
  let binaryAsString = num.toString(2);
  while (binaryAsString.length < 8) {
    binaryAsString = '0' + binaryAsString;
  }
  let binaryAsNumberArray = binaryAsString.split('').map(value => +value);
  return binaryAsNumberArray;
}
