const bcrypt = require('bcrypt');

bcrypt.hash("test#12", 10).then(hash => {
    console.log(hash);
});

// const bcrypt = require('bcrypt');
// crypt.hash()