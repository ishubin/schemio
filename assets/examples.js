(() => {
    const oldDate = new Date(new Date().getTime() - 20 * 24 * 3600000);
    const maxCommentsPerView = 50;

    const _comments = [{
        id: '1',
        text: 'Hi there!',
        time: oldDate.toISOString(),
        user: {
            id: '123qwe',
            link: '/users/123qwe',
            name: 'Johny',
        }
    }, {
        id: '2',
        text: 'Hello!',
        time: new Date(oldDate.getTime() + 120000).toISOString(),
        user: {
            id: '2345',
            link: '/users/2345',
            name: 'Jack',
        }
    }];

    for (let i = 3; i < 400; i++) {
        _comments.push({
            id: '' + i,
            text: 'fake comment #' + i,
            time: new Date(oldDate.getTime() + 200000 * i).toISOString(),
            user: {
                id: '123qwe',
                link: '/users/123qwe',
                name: 'Johny',
            }
        });
    }

    function findCommentsRange(from, till) {
        const startTime = new Date(from).getTime();
        const endTime = new Date(till).getTime();
        
        let start = -1;
        let end = -1;
        for (let i = 0; i < _comments.length; i++) {
            const t = new Date(_comments[i].time).getTime();
            if (t > startTime && start < 0) {
                start = i;
            }

            if (t < endTime) {
                end = i;
            } else if (start > 0) {
                end = i;
                break;
            }
        }

        return { start, end };
    }

    window.FakeCommentsProvider = {
        getComments(timeRange) {
            return new Promise(resolve => {
                let comments = [];
                const chunkSize = Math.ceil(maxCommentsPerView / 2);

                let start = 0;
                let end = _comments.length - 1;
                
                if (timeRange) {
                    const range = findCommentsRange(timeRange.from, timeRange.till);
                    start = range.start;
                    end = range.end;
                }

                if (end - start > maxCommentsPerView) {
                    const firstPart = _comments.slice(start, start + chunkSize);
                    const secondPart = _comments.slice(end - chunkSize, end);

                    comments = firstPart.concat([{
                        id: null,
                        text: 'Load more comments',
                        kind: 'placeholder',
                        timeRange: {
                            from: firstPart[firstPart.length - 1].time,
                            till: secondPart[0].time
                        }
                    }]).concat(secondPart);
                } else {
                    comments = _comments.slice(start, end);
                }

                const result = {
                    comments: JSON.parse(JSON.stringify(comments)),
                    timeRange: timeRange
                };
                setTimeout(resolve(result), 500);
            });
        }, 

        leaveComment(message) {
            const id = _comments.length + '-' + Math.round(Math.random() * 10000);
            _comments.push({
                id: id,
                message: message,
                time: '2021-09-29T07:51:14.214063331Z',
                user: {
                    id: '123qwe',
                    name: 'Johny',
                    email: 'johny@example.com'
                }
            });

            return new Promise(resolve => {
                const result = {
                    id: id,
                    text: message,
                    time: '2021-09-29T07:51:14.214063331Z',
                    user: {
                        id: '2345',
                        link: '/users/2345',
                        name: 'Jack',
                    }
                };
                setTimeout(resolve(result), 500);
            });
        },

        deleteComment(id) {
            return Promise.resolve(null);
        }
    };

})();

