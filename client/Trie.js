class TrieNode {
  constructor() {
    this.children = {};
    this.isEnd = false;
  }
}

class Trie {
  constructor() {
    this.root = new TrieNode();
  }

  insert(word) {
    let cur = this.root;
    for (let ch of word.toLowerCase()) {
      if (!cur.children[ch]) {
        cur.children[ch] = new TrieNode();
      }
      cur = cur.children[ch];
    }
    cur.isEnd = true;
  }
  maskAbuses(msg) {
    msg += ' ';
    let n = msg.length;
    let mask = '';
    let cur = this.root;
    let AbuseWord = true;
    let original = '';
    let fake = '';
    for (let i = 0; i < n; i++) {

        let ch = msg[i];
        
        if(ch == ' '){
            if(AbuseWord && cur.isEnd){
                mask += fake;
            } else {
              mask += original;
            }
            if(i != n-1) mask += ' ';
            fake = '';
            original = '';
            cur = this.root;
            AbuseWord = true;
        } else {
            if(AbuseWord && cur.children[ch.toLowerCase()]){
              cur = cur.children[ch.toLowerCase()];
            } else {
              AbuseWord = false;
            }
            original += ch;
            fake += '*';
        }
        
    }
    return mask;
  }
}

export default Trie;
