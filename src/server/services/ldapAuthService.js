/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

const ldap          = require('ldapjs');
const config        = require('../config.js');

class LdapAuthService {
    constructor() {
        this.client = ldap.createClient({
            url: config.auth.ldap.url,
            timeout: config.auth.ldap.timeout,
            connectTimeout: config.auth.ldap.connectTimeout
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
            this.client.bind(config.auth.ldap.bind.dn, config.auth.ldap.bind.password, err => {
                if (err) {
                    rejected(err);
                } else {
                    this.client.search(config.auth.ldap.search.baseDn, opts, (err, search) => {
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
