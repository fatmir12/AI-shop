
package com.aishop.backend.service;

import com.aishop.backend.dto.CategoryRequest;
import com.aishop.backend.entity.Category;
import com.aishop.backend.repository.CategoryRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public CategoryService(CategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Category getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Category not found"
                ));
    }

    @Transactional
    public Category createCategory(CategoryRequest request) {

        String name = request.name().trim();

        if (categoryRepository.existsByName(name)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Category already exists"
            );
        }

        Category category = new Category();
        category.setName(name);
        category.setDescription(request.description());

        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(Long id, CategoryRequest request) {

        Category category = getCategoryById(id);
        String name = request.name().trim();

        if (!category.getName().equals(name)
                && categoryRepository.existsByName(name)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Category already exists"
            );
        }

        category.setName(name);
        category.setDescription(request.description());

        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(Long id) {

        Category category = getCategoryById(id);
        categoryRepository.delete(category);
    }
}
