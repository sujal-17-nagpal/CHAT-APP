class Node{
    constructor(key,value){
        this.key = key;
        this.value = value;
        this.prev = null;
        this.next = null;
    }
}

class LRUcache{
    constructor(capacity = 10000){
        this.capacity = capacity
        this.mp = new Map();
        this.head = new Node(null,null);
        this.tail = new Node(null,null);
        this.head.next = this.tail;
        this.tail.prev = this.head;
    }

    insert_at_head(node){
        this.head.next.prev = node;
        node.next = this.head.next;
        node.prev = this.head;
        this.head.next = node;
    }

    delete(node){
        node.prev.next = node.next;
        node.next.prev = node.prev;
        this.mp.get(node.key);
    }

    add(key,value){
        if(this.mp.has(key)) return;
        if(this.mp.size >=this.capacity){
            this.mp.delete(this.tail.prev.key)
            this.delete(this.tail.prev)
        }
        const newNode = new Node(key,value);
        this.mp.set(key,newNode);
        this.insert_at_head(newNode)
    }

    get(key){
            if (!this.mp.has(key)) return null;
            const existingNode = this.mp.get(key);
            this.delete(existingNode);
            this.insert_at_head(existingNode);
           return existingNode.value;
    }

    delPattern(pattern){
        for(const key of this.mp.keys()){
            if(key.includes(pattern)){
                this.delete(this.mp.get(key));
                this.mp.delete(key);
            }
        }
    }
    deleteKey(key){
        if(this.mp.has(key)){
            const node = this.mp.get(key)
            this.mp.delete(key)
            this.delete(node)
        }
    }
}

export default LRUcache