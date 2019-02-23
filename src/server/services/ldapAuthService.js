const ldap = require('ldapjs');



class LdapAuthService {
    constructor() {
        this.client = ldap.createClient({
            url: 'ldap://127.0.0.1:389/ou=people,dc=planetexpress,dc=com',
            timeout: 5000,
            connectTimeout: 10000
        });
    }


    findUser(userId, password) {
        //TODO escape userId for ldap
        var opts = {
            filter: '(&(objectClass=inetOrgPerson)(uid='+userId+'))',
            scope: 'sub',
            attributes: ['uid', 'cn', 'mail']
        };

        return new Promise((resolve, rejected) => {
            this.client.bind('cn=admin,dc=planetexpress,dc=com', 'GoodNewsEveryone', err => {
                if (err) {
                    rejected(err);
                } else {
                    this.client.search('ou=people,dc=planetexpress,dc=com', opts, (err, search) => {
                        if (err) {
                            rejected(err)
                        } else {
                            var ldapObject = null;
                            search.on('searchEntry', entry => {
                                ldapObject = entry.object;
                            });
                            search.on('error', (err) => {
                                rejected(err);
                            });
                            search.on('end', () => {
                                if (ldapObject) {
                                    resolve({
                                        login: ldapObject.uid,
                                        userName: ldapObject.cn,
                                        mail: ldapObject.mail
                                    });
                                } else {
                                    rejected('User not found');
                                }
                            });
                        }
                    });
                }
            });
        });
    }
}


module.exports = new LdapAuthService();
