const pi = require('react-icons/pi');
const icons = Object.keys(pi);
const check = ['PiCaretLeftBold', 'PiHeartFill', 'PiBellSlashFill', 'PiShieldCheckFill', 'PiGameControllerFill'];
check.forEach(i => {
  console.log(`${i} exists: ${icons.includes(i)}`);
});
