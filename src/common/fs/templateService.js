
import fs from 'fs-extra';


const templateService = {
    getAll() {
        return fs.readFile('assets/templates/index.json')
            .then(JSON.parse);
    }
};

export default templateService;