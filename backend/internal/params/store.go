package params

import "sync"

// Store is the in-memory parameter set the admin endpoint replaces.
type Store struct {
	mu sync.RWMutex
	p  Parameters
}

// NewStore seeds the store with a validated copy of p.
func NewStore(p Parameters) *Store {
	if err := p.Validate(); err != nil {
		panic(err)
	}
	return &Store{p: p.Clone()}
}

// Get returns a deep copy of the current parameters.
func (s *Store) Get() Parameters {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.p.Clone()
}

// Put replaces the parameter set after validation.
func (s *Store) Put(p Parameters) error {
	if err := p.Validate(); err != nil {
		return err
	}
	s.mu.Lock()
	s.p = p.Clone()
	s.mu.Unlock()
	return nil
}
