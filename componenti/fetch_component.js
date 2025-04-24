export const generateFetchComponent = () => {
    // GRAZIE CECIRE
    let conf; 
    return {
        setData: (data,token,key) => {
            return new Promise((resolve, reject) => {
                fetch("https://ws.cipiaceinfo.it/cache/set", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "key": token
                    },
                    body: JSON.stringify({
                        key: key,
                        value: JSON.stringify(data)
                    })
                })
                .then(r => r.json())
                .then(data => resolve(data.result))
                .catch(err => reject(err.result));
            });
        },
        getData: (token,key) => {
            return new Promise((resolve, reject) => {
                fetch("https://ws.cipiaceinfo.it/cache/get", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                        "key": token
                    },
                    body: JSON.stringify({
                        key: key
                    })
                })
                .then(r => r.json())
                .then(data => resolve(JSON.parse(data.result)))
                .catch(err => reject(err.result));
            })
        }
    }
};



