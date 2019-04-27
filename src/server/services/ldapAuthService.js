/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

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
        userId = userId.replace(/\W/g, userId);
        var opts = {
            filter: '(uid='+userId+')',
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
                                    //trying to bind to client with password
                                    this.client.bind(ldapObject.dn, password, err => {
                                        if (err)  {
                                            rejected('User not found');
                                        } else {
                                            resolve({
                                                login: ldapObject.uid,
                                                userName: ldapObject.cn,
                                                mail: ldapObject.mail
                                            });
                                        }
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
