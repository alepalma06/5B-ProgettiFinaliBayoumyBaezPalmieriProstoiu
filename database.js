const fs = require('fs');
const mysql = require('mysql2');
const conf = JSON.parse(fs.readFileSync('./public/conf.json'));//leggo il conf json
conf.ssl = {
   ca: fs.readFileSync(__dirname + '/ca.pem')//leggo il ca pem
};
const connection = mysql.createConnection(conf);

const executeQuery = (sql) => {
   return new Promise((resolve, reject) => {
      connection.query(sql, function (err, result) {
         if (err) {
            console.error(err);
            reject(err);
         }
         console.log('done');
         resolve(result);
      });
   });
};

const database = {
   createTable: async () => {
      //creo tabella se nn esiste
      await executeQuery(`
         CREATE TABLE IF NOT EXISTS poker (
         id INT PRIMARY KEY NOT NULL,
         username VARCHAR(255) NOT NULL,
         password VARCHAR(255) NOT NULL,
         email VARCHAR(255) UNIQUE KEY NOT NULL,
         fiches INT NOT NULL
         )`
      );
   },
   //faccio insert nella tabella 
   insert: async (poker) => {
      let sql = `
         INSERT INTO poker (username, password, email, fiches)
         VALUES (
            '${poker.username}', 
            '${poker.password}', 
            '${poker.email}', 
            '${poker.fiches}')`
      ;
      return await executeQuery(sql);
   },
   delete: (username,email) => {//delete
      let sql = `
        DELETE FROM poker
        WHERE username='${username}' AND email='${email}'`
      ;
      return executeQuery(sql);
   },
   select: async () => {
      let sql = `
    SELECT *
    FROM poker
`;
      let result = await executeQuery(sql);
  
      if (!result || result.length === 0) {//se non ce niente restituisce vuoto
          return [];
      }
  
      return result;
  },   
   drop: async () => {//cancella completamente i contenuto ma nn la usiamo
      sql = `
            DROP TABLE IF EXISTS poker`
           ;
      await executeQuery(sql);
   },
};
module.exports = database;//esposta database