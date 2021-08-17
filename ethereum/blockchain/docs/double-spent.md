# Double spending

  Double-spending is the risk that a digital currency can be spent twice. It is a potential problem unique to digital currencies because digital information can be reproduced relatively easily by savvy individuals who understand the blockchain network and the computing power necessary to manipulate it.

## [see the sequence diagrams](https://mermaid-js.github.io/mermaid/#/sequenceDiagram?id=sequence-diagrams)

```mermaid
%% double spending
sequenceDiagram
	autonumber
	title: Double spending
	participant victim
	participant attack


	Note over victim: block

	attack->>victim: Connect
	attack-->>victim: Sync the victim's chain

	Note over victim: Block

	loop Sync victim's block
		par Sync victim's block
			Note over attack: sync victim's block
		and attack generate block
			Note over attack:  block
		and victim generate block
			Note over victim: generate block
		end
	end

	attack-->>victim: Sync stop

	Note over attack: attack's block
	Note over victim: block  
	Note over attack: attack's block

	attack->>+victim: Reconnect
	victim-->>attack: Sync start, because the hashrate of attacker is higher

	loop Sync attack's block
		par Sync attack's block 
			Note over victim: attack's block
			Note right of victim: origin block
			Note over victim: attack's block
			Note right of victim: origin block
		and attack generate block
			Note over attack: block 
		end
	end
	victim-->>attack: Sync end

	par victim generate block
		Note over victim: ledger block
	and attack generate block
		Note over attack: ledger block   
	end
  
```