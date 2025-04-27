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
         username VARCHAR(100) PRIMARY KEY NOT NULL,
         password VARCHAR(100) NOT NULL,
         fiches INT NOT NULL
         )`
      );
   },
   //faccio insert nella tabella 
   insert: async (poker) => {
      let sql = `
         INSERT INTO poker (username, password, fiches)
         VALUES (
            '${poker.username}', 
            '${poker.password}', 
            '${poker.fiches}')`
      ;
      return await executeQuery(sql);
   },
   delete: (id) => {//delete ma nn viene usato
      let sql = `
        DELETE FROM poker
        WHERE username=${username}`
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