class bloomFilter{

    // setting default size of bloom filter as 20000
    constructor(size = 20000){
        this.size = size;
        this.bitArray = new Array(size).fill(false)
    }

    hash1(str){
        let hash = 0;
        for(let i = 0;i<str.length;i++){
            hash = (hash*31 + str.charCodeAt(i))%this.size;
        }
        return hash;
    }

    hash2(str){
        let hash = 7;
        for(let i=0;i<str.length;i++){
            hash = (hash*17 + str.charCodeAt(i))%this.size;
        }
        return hash;
    }

    add(str){
        let hash1 = this.hash1(str);
        let hash2 = this.hash2(str);
        this.bitArray[hash1] = true;
        this.bitArray[hash2] = true;
    }

    exists(str){
        const hash1 = this.hash1(str)
        const hash2 = this.hash2(str)
        return (this.bitArray[hash1] && this.bitArray[hash2]);
    }
}

export default bloomFilter