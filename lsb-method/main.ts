const messageInput = <HTMLInputElement>document.getElementById('message');              // выбор элементов интерфейса со страницы
const encodeFileInput = <HTMLInputElement>document.getElementById('encodeFileInput');
const encodeButton = document.getElementById('encodeButton');
const downloadLink = document.createElement('a');
const decodeFileInput = <HTMLInputElement>document.getElementById('decodeFileInput');
const decodeButton = document.getElementById('decodeButton');

// названия функций говорят сами за себя, типы данных везде указаны
// я очень долго делал эту лабу и у меня наконец-то получилось
// я не хочу комментировать каждую строчку потому что в этом нет смысла и сейчас 5 утра и я очень хочу спать

encodeFileInput.addEventListener('change', async () => { // обработчик события выбора файла для шифровки
  const image = encodeFileInput.files[0];
  const imageBase64 = await fileToBase64(image);

  const previewImage = new Image(250);
  previewImage.src = imageBase64;
  document.getElementById('preview').appendChild(previewImage);
});

encodeButton.addEventListener('click', async () => {  // обработчик события нажатия на кнопку "Зашифровать"
  if (!encodeFileInput.files.length) return;
  const image = encodeFileInput.files[0];
  const imageBase64 = await fileToBase64(image);
  const imageData = await base64ToImageData(imageBase64);

  const message = messageInput.value ? messageInput.value : 'Hello world';

  const encodedImageData = await encodeMessageIntoImageData(message, imageData);

  downloadLink.href = imageDataToBase64(encodedImageData);
  downloadLink.download = 'encoded-' + image.name.match(/.+(?=\.)/gi)[0];
  downloadLink.textContent = 'Скачать зашифрованное изображение';
  document.getElementById('result').appendChild(downloadLink);
})

decodeFileInput.addEventListener('change', async () => {  // обработчик события выбора файла для расшифровки
  const image = decodeFileInput.files[0];
  const imageBase64 = await fileToBase64(image);

  const previewImage = new Image(250);
  previewImage.src = imageBase64;
  document.getElementById('preview2').appendChild(previewImage);
});

decodeButton.addEventListener('click', async () => { // обработчик события нажатия на кнопку "Расшифровать"
  if (!decodeFileInput.files.length) return;
  const image = decodeFileInput.files[0];
  const imageBase64 = await fileToBase64(image);
  const imageData = await base64ToImageData(imageBase64);

  const decodedMessage = decodeImageData(imageData);

  document.getElementById('result2').textContent = decodedMessage;
});

async function encodeMessageIntoImageData(message: string, imgData: ImageData): Promise<ImageData> { // функция которая принимает сообщение и изображение
  const binaryMessage = await messageToBinary(message);                                              // и возвращает новое зашифрованное изображение

  const imagePixels = Array.from(imgData.data);

  let binaryMessageCounter = 0;

  for (let i = 0; i < imagePixels.length; i++) {
    if (((i + 1) % 4) === 0) continue; // не трогаем a-канал для совместимости с jpeg
    if (binaryMessageCounter > binaryMessage.length) break;
    let currentValue = imagePixels[i];
    let encodedValue = ((currentValue >> 1) << 1) | binaryMessage[binaryMessageCounter]; // ВОТ ТУТ собественно алгоритм шифрования отдельного бита пикселя
    imagePixels[i] = encodedValue;
    binaryMessageCounter++;
  }

  return new ImageData(new Uint8ClampedArray(imagePixels), imgData.width, imgData.height);
}

function decodeImageData(imgData: ImageData): string { // функция которая принимает зашифрованное изображение и возвращает из него сообщение
  const imagePixels = Array.from(imgData.data);

  let messageBinaryLength: number[] = [];
  let binaryMessageCounter = 0;

  for (let i = 0; i < imagePixels.length; i++) {
    if (((i + 1) % 4) === 0) continue;
    if (binaryMessageCounter >= 32) break;
    const leastSignificantBit = imagePixels[i] & 1; // ВОТ ТУТ собственно формула расшифровки отдельного бита пикселя
    messageBinaryLength.push(leastSignificantBit);
    binaryMessageCounter++;
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

async function messageToBinary(message: string): Promise<number[]> { // функция которая конвертирует сообщение в бинарный вид
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

function fileToBase64(file: File): Promise<string> { // функция которая конвертирует тип данных "файл" в строковое 64-битное представление
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(<string>reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function base64ToImageData(base64: string): Promise<ImageData> { // конвертирует строковое 64-битное представление в картинку
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

function imageDataToBase64(imgData: ImageData): string { // конвертирует картинку в строковое 64-битное представление
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgData.width;
  canvas.height = imgData.height;
  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

function decimalToBinary8Bit(num: number): number[] {  // конвертирует 10-ричное число в двоичное восьмибитное
  let binaryAsString = num.toString(2);
  while (binaryAsString.length < 8) {
    binaryAsString = '0' + binaryAsString;
  }
  let binaryAsNumberArray = binaryAsString.split('').map(value => +value);
  return binaryAsNumberArray;
}
