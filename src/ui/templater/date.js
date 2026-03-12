import { formatDate } from "../datetime";

export class SchemioDate {
    constructor(d) {
        if (typeof d === 'string') {
            this.date = new Date(Date.parse(d));
        } else if (typeof d === 'number') {
            this.date = new Date(d);
        } else if (d instanceof Date) {
            this.date = d;
        } else {
            throw new Error('Cannot convert object to date');
        }
    }

    formatDate(format) {
        return formatDate(this.date, format);
    }

    sub(dateOrSeconds) {
        if (dateOrSeconds instanceof SchemioDate) {
            return (this.date.getTime() - dateOrSeconds.date.getTime()) / 1000;
        } else if (typeof d === 'number') {
            return new SchemioDate(new Date(this.date.getTime() - dateOrSeconds * 1000));
        }
        throw new Error('Cannot convert object to date or number');
    }

    add(seconds) {
        if (typeof seconds !== 'number') {
            throw new Error('Cannot convert object to number');
        }
        return new SchemioDate(new Date(this.date.getTime() + seconds * 1000));
    }
}

